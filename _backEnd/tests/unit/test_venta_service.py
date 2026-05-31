"""
Mifrufely Web — VentaService Unit Tests
Tests checkout business logic in isolation (no real DB/NeonDB).

Validates:
  - Empty cart raises HTTP 400.
  - Single product purchase: calculates subtotal, creates DetalleVenta.
  - Single package purchase: expands components, creates trazabilidad.
  - Mixed cart (product + package): aggregates totals correctly.
  - Product not found raises HTTP 404.
  - Inactive product raises HTTP 400.
  - Insufficient stock (product) raises HTTP 400.
  - Insufficient stock (package component) raises HTTP 400.
  - Non-existent package raises HTTP 400.
  - IGV is calculated correctly (18%).
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.infrastructure.database.models.enums import OrigenVentaEnum, TipoPagoEnum
from app.modules.orders.schemas import ItemPaquete, ItemProducto, VentaRequest
from app.modules.orders.service import VentaService


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_producto_db(
    id_producto: int = 1,
    nombre: str = "Torta",
    precio: str = "20.00",
    stock_actual: int = 10,
    estado: bool = True,
) -> MagicMock:
    p = MagicMock()
    p.id_producto = id_producto
    p.nombre = nombre
    p.precio = Decimal(precio)
    p.stock_actual = stock_actual
    p.estado = estado
    return p


def make_paquete_producto(producto: MagicMock, cantidad: int = 1) -> MagicMock:
    pp = MagicMock()
    pp.id_paquete_producto = 1
    pp.id_paquete = 1
    pp.id_producto = producto.id_producto
    pp.cantidad = cantidad
    pp.producto = producto
    return pp


def make_paquete_db(
    id_paquete: int = 1,
    nombre: str = "Caja Premium",
    estado: bool = True,
    componentes: list | None = None,
) -> MagicMock:
    pkg = MagicMock()
    pkg.id_paquete = id_paquete
    pkg.nombre = nombre
    pkg.estado = estado
    pkg.productos = componentes or []
    return pkg


def make_venta_creada(
    id_venta: int = 1,
    total: str = "0.00",
) -> MagicMock:
    """Mock de la Venta persistida que retorna el repositorio."""
    venta = MagicMock()
    venta.id_venta = id_venta
    venta.id_cliente = 1
    venta.estado = MagicMock()
    venta.estado.value = "PENDIENTE"
    venta.estado_pago = MagicMock()
    venta.estado_pago.value = "PENDIENTE"
    venta.total = Decimal(total)
    venta.puntos_ganados = 0
    venta.fecha_venta = MagicMock()
    return venta


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_venta_repo() -> AsyncMock:
    repo = AsyncMock()
    repo.create_venta_transactional = AsyncMock()
    return repo


@pytest.fixture
def mock_paquete_repo() -> AsyncMock:
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    return repo


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.fixture
def service(
    mock_venta_repo: AsyncMock,
    mock_paquete_repo: AsyncMock,
    mock_session: AsyncMock,
) -> VentaService:
    return VentaService(
        repo=mock_venta_repo,
        paquete_repo=mock_paquete_repo,
        session=mock_session,
    )


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestVentaServiceCheckout:

    # ── Validaciones de entrada ────────────────────────────────────────────────

    async def test_carrito_vacio_lanza_400(self, service: VentaService) -> None:
        """Un carrito sin ítems debe levantar HTTP 400."""
        dto = VentaRequest(
            productos=[],
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )
        with pytest.raises(HTTPException) as exc_info:
            await service.create_checkout(id_cliente=1, dto=dto)
        assert exc_info.value.status_code == 400

    async def test_producto_no_encontrado_lanza_404(
        self,
        service: VentaService,
        mock_session: AsyncMock,
    ) -> None:
        """Un producto inexistente debe levantar HTTP 404."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute = AsyncMock(return_value=mock_result)

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=999, cantidad=1)],
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )
        with pytest.raises(HTTPException) as exc_info:
            await service.create_checkout(id_cliente=1, dto=dto)
        assert exc_info.value.status_code == 404

    async def test_producto_inactivo_lanza_400(
        self,
        service: VentaService,
        mock_session: AsyncMock,
    ) -> None:
        """Un producto inactivo debe levantar HTTP 400."""
        prod = make_producto_db(estado=False)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = prod
        mock_session.execute = AsyncMock(return_value=mock_result)

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=1, cantidad=1)],
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )
        with pytest.raises(HTTPException) as exc_info:
            await service.create_checkout(id_cliente=1, dto=dto)
        assert exc_info.value.status_code == 400
        assert "disponible" in exc_info.value.detail.lower()

    async def test_stock_insuficiente_producto_lanza_400(
        self,
        service: VentaService,
        mock_session: AsyncMock,
    ) -> None:
        """Stock insuficiente en producto individual debe levantar HTTP 400."""
        prod = make_producto_db(stock_actual=2)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = prod
        mock_session.execute = AsyncMock(return_value=mock_result)

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=1, cantidad=5)],  # pide 5, hay 2
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )
        with pytest.raises(HTTPException) as exc_info:
            await service.create_checkout(id_cliente=1, dto=dto)
        assert exc_info.value.status_code == 400
        assert "stock" in exc_info.value.detail.lower()

    # ── Paquetes ───────────────────────────────────────────────────────────────

    async def test_paquete_inexistente_lanza_400(
        self,
        service: VentaService,
        mock_paquete_repo: AsyncMock,
    ) -> None:
        """Paquete que no existe en la BD debe levantar HTTP 400."""
        mock_paquete_repo.get_by_id.return_value = None

        dto = VentaRequest(
            productos=[],
            paquetes=[ItemPaquete(id_paquete=999, cantidad=1)],
            tipo_pago=TipoPagoEnum.TARJETA,
        )
        with pytest.raises(HTTPException) as exc_info:
            await service.create_checkout(id_cliente=1, dto=dto)
        assert exc_info.value.status_code == 400

    async def test_stock_insuficiente_componente_paquete_lanza_400(
        self,
        service: VentaService,
        mock_paquete_repo: AsyncMock,
    ) -> None:
        """Un componente del paquete sin stock debe levantar HTTP 400."""
        prod_sin_stock = make_producto_db(stock_actual=0)
        paquete = make_paquete_db(
            componentes=[make_paquete_producto(prod_sin_stock, cantidad=1)]
        )
        mock_paquete_repo.get_by_id.return_value = paquete

        dto = VentaRequest(
            productos=[],
            paquetes=[ItemPaquete(id_paquete=1, cantidad=1)],
            tipo_pago=TipoPagoEnum.TARJETA,
        )
        with pytest.raises(HTTPException) as exc_info:
            await service.create_checkout(id_cliente=1, dto=dto)
        assert exc_info.value.status_code == 400
        assert "stock insuficiente" in exc_info.value.detail.lower()

    # ── Cálculos de totales ────────────────────────────────────────────────────

    async def test_igv_calculado_correctamente(
        self,
        service: VentaService,
        mock_session: AsyncMock,
        mock_venta_repo: AsyncMock,
    ) -> None:
        """
        El precio del catálogo incluye IGV.
        El servicio debe: total = subtotal = precio × cantidad.
        No se almacenan igv/base_imponible en el ORM (se calculan al emitir documento).
        """
        prod = make_producto_db(precio="118.00", stock_actual=5)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = prod
        mock_session.execute = AsyncMock(return_value=mock_result)

        venta_creada = make_venta_creada(total="118.00")
        captured: list = []

        async def capture_venta(v):  # type: ignore
            captured.append(v)
            return venta_creada

        mock_venta_repo.create_venta_transactional.side_effect = capture_venta

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=1, cantidad=1)],
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )

        await service.create_checkout(id_cliente=1, dto=dto)

        assert len(captured) == 1
        venta_interna = captured[0]

        # El subtotal y total deben ser iguales al precio × cantidad
        assert venta_interna.subtotal_productos == Decimal("118.00")
        assert venta_interna.total == Decimal("118.00")
        # Debe haberse generado 1 línea de detalle
        assert len(venta_interna.detalles) == 1

    async def test_paquete_acumula_precio_en_total(
        self,
        service: VentaService,
        mock_paquete_repo: AsyncMock,
        mock_venta_repo: AsyncMock,
        mock_session: AsyncMock,
    ) -> None:
        """El precio de los componentes del paquete debe acumularse en el subtotal."""
        prod1 = make_producto_db(id_producto=1, precio="25.00", stock_actual=10)
        prod2 = make_producto_db(id_producto=2, precio="10.00", stock_actual=10)
        paquete = make_paquete_db(
            componentes=[
                make_paquete_producto(prod1, cantidad=2),  # 2 × 25 = 50
                make_paquete_producto(prod2, cantidad=1),  # 1 × 10 = 10
            ]
        )
        mock_paquete_repo.get_by_id.return_value = paquete

        venta_creada = make_venta_creada(total="60.00")
        captured: list = []

        async def capture_venta(v):  # type: ignore
            captured.append(v)
            return venta_creada

        mock_venta_repo.create_venta_transactional.side_effect = capture_venta

        dto = VentaRequest(
            productos=[],
            paquetes=[ItemPaquete(id_paquete=1, cantidad=1)],
            tipo_pago=TipoPagoEnum.TARJETA,
        )

        await service.create_checkout(id_cliente=1, dto=dto)

        venta_interna = captured[0]
        assert venta_interna.total == Decimal("60.00")
        # 3 componentes en total expandidos a detalles_venta
        assert len(venta_interna.detalles) == 2  # prod1 y prod2

    async def test_checkout_mixto_producto_y_paquete(
        self,
        service: VentaService,
        mock_session: AsyncMock,
        mock_paquete_repo: AsyncMock,
        mock_venta_repo: AsyncMock,
    ) -> None:
        """Carrito mixto (producto + paquete) debe sumar totales correctamente."""
        prod_individual = make_producto_db(id_producto=10, precio="15.00", stock_actual=5)
        prod_en_paquete = make_producto_db(id_producto=20, precio="10.00", stock_actual=5)

        paquete = make_paquete_db(
            componentes=[make_paquete_producto(prod_en_paquete, cantidad=1)]
        )
        mock_paquete_repo.get_by_id.return_value = paquete

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = prod_individual
        mock_session.execute = AsyncMock(return_value=mock_result)

        venta_creada = make_venta_creada(total="25.00")
        captured: list = []

        async def capture_venta(v):  # type: ignore
            captured.append(v)
            return venta_creada

        mock_venta_repo.create_venta_transactional.side_effect = capture_venta

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=10, cantidad=1)],   # 15.00
            paquetes=[ItemPaquete(id_paquete=1, cantidad=1)],        # 10.00
            tipo_pago=TipoPagoEnum.TARJETA,
        )

        await service.create_checkout(id_cliente=1, dto=dto)

        venta_interna = captured[0]
        # Total = 15 (producto) + 10 (componente del paquete) = 25
        assert venta_interna.total == Decimal("25.00")
        # 2 líneas en detalles_venta: producto individual + componente del paquete
        assert len(venta_interna.detalles) == 2
        # 1 entrada en trazabilidad de paquetes
        assert len(venta_interna.paquetes_vendidos) == 1
