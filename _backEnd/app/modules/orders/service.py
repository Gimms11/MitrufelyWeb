from decimal import Decimal

import structlog
from sqlalchemy import select
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BusinessRuleError,
    DatabaseError,
    InsufficientStockError,
    NotFoundError,
)
from app.domain.services.base import AbstractService
from app.infrastructure.database.models.catalogo import Producto
from app.infrastructure.database.models.enums import (
    EstadoPagoEnum,
    EstadoTransaccionEnum,
    EstadoVentaEnum,
    TipoDocumentoVentaEnum,
)
from app.infrastructure.database.models.ventas import (
    DetalleVenta,
    Documento,
    MetodoPago,
    Venta,
    VentaPaquete,
)
from app.modules.orders.repository import IVentaRepository
from app.modules.orders.schemas import VentaRequest, VentaResponse
from app.modules.products.repository import IPaqueteRepository

logger = structlog.get_logger(__name__)


class VentaService(AbstractService[VentaResponse, VentaRequest, None, int]):
    def __init__(
        self,
        repo: IVentaRepository,
        paquete_repo: IPaqueteRepository,
        session: AsyncSession,
    ) -> None:
        self.repo = repo
        self.paquete_repo = paquete_repo
        self.session = session

    async def create_checkout(
        self,
        id_cliente: int,
        dto: VentaRequest,
        tipo_documento: TipoDocumentoVentaEnum = TipoDocumentoVentaEnum.BOLETA,
    ) -> VentaResponse:
        if not dto.has_items():
            raise BusinessRuleError("La orden debe contener al menos un producto o paquete.")

        subtotal = Decimal("0.0")

        nueva_venta = Venta(
            id_cliente=id_cliente,
            origen_venta=dto.origen_venta,
            estado=EstadoVentaEnum.PENDIENTE,
            estado_pago=EstadoPagoEnum.PENDIENTE,
            id_cupon_cliente=dto.id_cupon_cliente,
        )

        for item in dto.productos or []:
            stmt = select(Producto).where(Producto.id_producto == item.id_producto)
            result = await self.session.execute(stmt)
            producto = result.scalar_one_or_none()

            if not producto:
                raise NotFoundError(f"Producto con ID {item.id_producto} no encontrado.")
            if not producto.estado:
                raise BusinessRuleError(f"El producto '{producto.nombre}' no está disponible.")
            if producto.stock_actual < item.cantidad:
                raise InsufficientStockError(
                    f"Stock insuficiente para '{producto.nombre}'. "
                    f"Disponible: {producto.stock_actual}, "
                    f"Solicitado: {item.cantidad}."
                )

            linea_subtotal = producto.precio * item.cantidad
            subtotal += linea_subtotal

            nueva_venta.detalles.append(
                DetalleVenta(
                    id_producto=producto.id_producto,
                    cantidad=item.cantidad,
                    precio_unitario=producto.precio,
                    subtotal=linea_subtotal,
                )
            )

        for item in dto.paquetes or []:
            paquete_db = await self.paquete_repo.get_by_id(item.id_paquete)
            if not paquete_db or not paquete_db.estado:
                raise BusinessRuleError(
                    f"Paquete con ID {item.id_paquete} no existe o no está activo."
                )

            precio_paquete = Decimal("0.0")
            composicion_snapshot = []

            for pp in paquete_db.productos:
                producto = pp.producto
                cantidad_necesaria = pp.cantidad * item.cantidad

                if not producto.estado or producto.stock_actual < cantidad_necesaria:
                    raise InsufficientStockError(
                        f"Stock insuficiente para '{producto.nombre}' "
                        f"dentro del paquete '{paquete_db.nombre}'."
                    )

                precio_componente = producto.precio * pp.cantidad
                precio_paquete += precio_componente

                composicion_snapshot.append(
                    {
                        "id_producto": producto.id_producto,
                        "nombre": producto.nombre,
                        "cantidad_por_paquete": pp.cantidad,
                        "precio_unitario": str(producto.precio),
                    }
                )

                nueva_venta.detalles.append(
                    DetalleVenta(
                        id_producto=producto.id_producto,
                        cantidad=cantidad_necesaria,
                        precio_unitario=producto.precio,
                        subtotal=precio_componente * item.cantidad,
                    )
                )

            subtotal += precio_paquete * item.cantidad

            nueva_venta.paquetes_vendidos.append(
                VentaPaquete(
                    id_paquete=paquete_db.id_paquete,
                    cantidad=item.cantidad,
                    nombre_paquete_snapshot=paquete_db.nombre,
                    composicion_snapshot_json=composicion_snapshot,
                )
            )

        base_imponible = (subtotal / Decimal("1.18")).quantize(Decimal("0.01"))
        igv = (subtotal - base_imponible).quantize(Decimal("0.01"))

        nueva_venta.subtotal_productos = subtotal
        nueva_venta.base_imponible = base_imponible
        nueva_venta.igv = igv
        nueva_venta.total = subtotal

        nueva_venta.metodos_pago.append(
            MetodoPago(
                tipo_pago=dto.tipo_pago,
                monto=subtotal,
                estado_transaccion="PENDIENTE",
            )
        )

        try:
            async with self.session.begin():
                self.session.add(nueva_venta)
                await self.session.flush()

                self.session.add(
                    Documento(
                        id_venta=nueva_venta.id_venta,
                        tipo_documento=tipo_documento,
                    )
                )

        except DBAPIError as exc:
            error_msg = str(exc.orig) if exc.orig else str(exc)
            logger.warning(
                "checkout.trigger_error",
                id_cliente=id_cliente,
                error=error_msg,
            )
            if "Stock insuficiente" in error_msg:
                raise InsufficientStockError(error_msg) from exc
            raise DatabaseError(error_msg) from exc

        except Exception as exc:
            logger.error(
                "checkout.unexpected_error",
                id_cliente=id_cliente,
                error=str(exc),
            )
            raise DatabaseError("Error inesperado al procesar el checkout.") from exc

        logger.info(
            "checkout.success",
            id_venta=nueva_venta.id_venta,
            id_cliente=id_cliente,
            total=str(nueva_venta.total),
        )

        await self.session.refresh(nueva_venta)

        return VentaResponse(
            id_venta=nueva_venta.id_venta,
            id_cliente=nueva_venta.id_cliente,
            estado=nueva_venta.estado.value,
            estado_pago=nueva_venta.estado_pago.value,
            total=nueva_venta.total,
            puntos_ganados=nueva_venta.puntos_ganados,
            fecha_venta=nueva_venta.fecha_venta,
        )

    async def confirmar_pago(self, id_venta: int) -> VentaResponse:
        """
        Marca una venta como PAGADA (uso académico / admin).
        La actualización de estado_pago dispara tg_ventas_otorgar_puntos
        que registra ACUMULACION_VENTA en movimientos_puntos.
        """
        stmt = select(Venta).where(Venta.id_venta == id_venta)
        result = await self.session.execute(stmt)
        venta = result.scalar_one_or_none()

        if not venta:
            raise NotFoundError(f"Venta con ID {id_venta} no encontrada.")
        if venta.estado.value == "ANULADO":
            raise BusinessRuleError("No se puede pagar una venta anulada.")
        if venta.estado_pago == EstadoPagoEnum.PAGADO:
            raise BusinessRuleError("La venta ya está pagada.")

        try:
            async with self.session.begin():
                venta.estado_pago = EstadoPagoEnum.PAGADO

                pago_stmt = select(MetodoPago).where(MetodoPago.id_venta == id_venta)
                pago_result = await self.session.execute(pago_stmt)
                pago = pago_result.scalar_one_or_none()
                if pago:
                    pago.estado_transaccion = EstadoTransaccionEnum.APROBADO

                self.session.add(venta)
                await self.session.flush()

        except DBAPIError as exc:
            error_msg = str(exc.orig) if exc.orig else str(exc)
            logger.error("confirmar_pago.error", id_venta=id_venta, error=error_msg)
            raise DatabaseError(error_msg) from exc

        except Exception as exc:
            logger.error(
                "confirmar_pago.unexpected_error",
                id_venta=id_venta,
                error=str(exc),
            )
            raise DatabaseError("Error inesperado al confirmar el pago.") from exc

        await self.session.refresh(venta)

        logger.info(
            "confirmar_pago.success",
            id_venta=venta.id_venta,
            puntos_ganados=venta.puntos_ganados,
        )

        return VentaResponse(
            id_venta=venta.id_venta,
            id_cliente=venta.id_cliente,
            estado=venta.estado.value,
            estado_pago=venta.estado_pago.value,
            total=venta.total,
            puntos_ganados=venta.puntos_ganados,
            fecha_venta=venta.fecha_venta,
        )

    async def get_by_id(self, id_venta: int) -> VentaResponse:
        venta = await self.repo.get_by_id(id_venta)
        if not venta:
            raise NotFoundError(f"Venta con ID {id_venta} no encontrada.")
        return VentaResponse(
            id_venta=venta.id_venta,
            id_cliente=venta.id_cliente,
            estado=venta.estado.value,
            estado_pago=venta.estado_pago.value,
            total=venta.total,
            puntos_ganados=venta.puntos_ganados,
            fecha_venta=venta.fecha_venta,
        )

    async def get_all(self, *, limit: int = 100, offset: int = 0) -> list[VentaResponse]:
        ventas = await self.repo.get_all(limit=limit, offset=offset)
        return [
            VentaResponse(
                id_venta=v.id_venta,
                id_cliente=v.id_cliente,
                estado=v.estado.value,
                estado_pago=v.estado_pago.value,
                total=v.total,
                puntos_ganados=v.puntos_ganados,
                fecha_venta=v.fecha_venta,
            )
            for v in ventas
        ]

    async def get_by_cliente(
        self, id_cliente: int, *, limit: int = 100, offset: int = 0
    ) -> list[VentaResponse]:
        ventas = await self.repo.find_by_cliente(id_cliente, limit=limit, offset=offset)
        return [
            VentaResponse(
                id_venta=v.id_venta,
                id_cliente=v.id_cliente,
                estado=v.estado.value,
                estado_pago=v.estado_pago.value,
                total=v.total,
                puntos_ganados=v.puntos_ganados,
                fecha_venta=v.fecha_venta,
            )
            for v in ventas
        ]
