from decimal import Decimal
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.services.base import AbstractService
from app.infrastructure.database.models.catalogo import Producto
from app.infrastructure.database.models.ventas import DetalleVenta, MetodoPago, Venta, VentaPaquete
from app.modules.orders.repository import IVentaRepository
from app.modules.orders.schemas import VentaRequest, VentaResponse
from app.modules.products.repository import IPaqueteRepository


class VentaService(AbstractService[VentaResponse, VentaRequest, None, int]):
    def __init__(self, repo: IVentaRepository, paquete_repo: IPaqueteRepository, session: AsyncSession) -> None:
        self.repo = repo
        self.paquete_repo = paquete_repo
        self.session = session

    async def create_checkout(self, id_cliente: int, dto: VentaRequest) -> VentaResponse:
        """
        Lógica de Checkout transaccional:
        1. Validar productos individuales y sumar al subtotal.
        2. Validar paquetes, expandirlos en detalles_venta y sumar al subtotal.
        3. Crear la venta, registrar venta_paquetes.
        4. Guardar detalles_venta (dispara triggers FEFO en NeonDB).
        5. Todo dentro de una transacción.
        """
        if not dto.has_items():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La orden debe contener al menos un producto o paquete."
            )

        subtotal = Decimal("0.0")

        nueva_venta = Venta(
            id_cliente=id_cliente,
            origen_venta=dto.origen_venta,
            estado="PENDIENTE",
            estado_pago="PENDIENTE",
            id_cupon_cliente=dto.id_cupon_cliente
        )

        # ── 1. Procesar Productos individuales ────────────────────────────────
        for item in dto.productos:
            stmt = select(Producto).where(Producto.id_producto == item.id_producto)
            result = await self.session.execute(stmt)
            producto = result.scalar_one_or_none()

            if not producto:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Producto con ID {item.id_producto} no encontrado."
                )
            if not producto.estado:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El producto '{producto.nombre}' no está disponible."
                )
            if producto.stock_actual < item.cantidad:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Stock insuficiente para '{producto.nombre}'. "
                        f"Disponible: {producto.stock_actual}, Solicitado: {item.cantidad}."
                    )
                )

            linea_subtotal = producto.precio * item.cantidad
            subtotal += linea_subtotal

            # Inserción física en detalles_venta → dispara trigger FEFO en NeonDB
            nueva_venta.detalles.append(
                DetalleVenta(
                    id_producto=producto.id_producto,
                    cantidad=item.cantidad,
                    precio_unitario=producto.precio,
                    subtotal=linea_subtotal,
                )
            )

        # ── 2. Procesar Paquetes y Expansión ──────────────────────────────────
        for item in dto.paquetes:
            paquete_db = await self.paquete_repo.get_by_id(item.id_paquete)
            if not paquete_db or not paquete_db.estado:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Paquete con ID {item.id_paquete} no existe o no está activo."
                )

            # Verificar disponibilidad de componentes (incluye check de stock real)
            precio_paquete = Decimal("0.0")
            composicion_snapshot = []

            for pp in paquete_db.productos:
                producto = pp.producto
                if not producto.estado or producto.stock_actual < (pp.cantidad * item.cantidad):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Stock insuficiente para el producto '{producto.nombre}' "
                            f"dentro del paquete '{paquete_db.nombre}'."
                        )
                    )

                precio_componente = producto.precio * pp.cantidad
                precio_paquete += precio_componente

                composicion_snapshot.append({
                    "id_producto": producto.id_producto,
                    "nombre": producto.nombre,
                    "cantidad_por_paquete": pp.cantidad,
                    "precio_unitario": str(producto.precio)
                })

                # EXPANSION: insertar en detalles_venta para que NeonDB ejecute FEFO
                nueva_venta.detalles.append(
                    DetalleVenta(
                        id_producto=producto.id_producto,
                        cantidad=pp.cantidad * item.cantidad,
                        precio_unitario=producto.precio,
                        subtotal=precio_componente * item.cantidad,
                    )
                )

            subtotal += precio_paquete * item.cantidad

            # Trazabilidad comercial: snapshot histórico del paquete
            nueva_venta.paquetes_vendidos.append(
                VentaPaquete(
                    id_paquete=paquete_db.id_paquete,
                    cantidad=item.cantidad,
                    nombre_paquete_snapshot=paquete_db.nombre,
                    composicion_snapshot_json=composicion_snapshot,
                )
            )

        # ── 3. Cálculos de Totales (IGV 18% incluído en precio) ───────────────
        # El modelo Venta no almacena igv/base_imponible directamente.
        # Los precios de catálogo ya incluyen IGV; el desglose se hace al emitir documentos.
        nueva_venta.subtotal_productos = subtotal
        nueva_venta.total = subtotal

        nueva_venta.metodos_pago.append(
            MetodoPago(
                tipo_pago=dto.tipo_pago,
                monto=subtotal,
                estado_transaccion="PENDIENTE",
            )
        )

        try:
            # 4. Persistir — los triggers de NeonDB ejecutarán FEFO y Kardex
            venta_creada = await self.repo.create_venta_transactional(nueva_venta)
            await self.session.commit()

            return VentaResponse(
                id_venta=venta_creada.id_venta,
                id_cliente=venta_creada.id_cliente,
                estado=venta_creada.estado.value,
                estado_pago=venta_creada.estado_pago.value,
                total=venta_creada.total,
                puntos_ganados=venta_creada.puntos_ganados,
                fecha_venta=venta_creada.fecha_venta,
            )
        except Exception as e:
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Error en el proceso de checkout, posible falta de lotes físicos: {str(e)}"
            )
