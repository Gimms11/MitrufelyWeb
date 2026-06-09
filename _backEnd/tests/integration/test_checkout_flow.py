"""
Mifrufely Web — Integration Tests: Checkout Flow (Fase 4)
Tests the complete checkout flow with mocked DB session.
"""

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.infrastructure.database.models.enums import OrigenVentaEnum, TipoPagoEnum
from app.modules.orders.schemas import ItemProducto, VentaRequest
from app.modules.orders.service import VentaService


def _apply_venta_defaults(obj):
    if hasattr(obj, "puntos_ganados") and not isinstance(getattr(obj, "puntos_ganados", None), int):
        object.__setattr__(obj, "puntos_ganados", 0)
    if hasattr(obj, "fecha_venta") and not isinstance(getattr(obj, "fecha_venta", None), datetime):
        object.__setattr__(obj, "fecha_venta", datetime.now(timezone.utc))
    if hasattr(obj, "id_venta") and obj.id_venta is None:
        object.__setattr__(obj, "id_venta", 1)


@pytest.mark.integration
class TestCheckoutFlowIntegration:
    async def test_crear_venta_item_real(
        self,
        service,
        mock_session,
        db_session_sample_product,
    ) -> None:
        prod = db_session_sample_product
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = prod
        mock_session.execute = AsyncMock(return_value=mock_result)

        session_add_calls: list = []
        mock_session.add.side_effect = lambda obj: session_add_calls.append(obj)

        async def flush_apply():
            for obj in session_add_calls:
                _apply_venta_defaults(obj)

        mock_session.flush.side_effect = flush_apply

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=1, cantidad=2)],
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )

        result = await service.create_checkout(id_cliente=1, dto=dto)
        assert result.estado == "PENDIENTE"
        assert result.estado_pago == "PENDIENTE"
        assert result.total > Decimal("0")
        assert result.id_venta == 1
        assert result.id_cliente == 1


@pytest.mark.integration
class TestCheckoutEdgeCases:
    async def test_stock_exacto_permite_compra(self, service, mock_session) -> None:
        from app.infrastructure.database.models.catalogo import Producto

        prod = MagicMock(spec=Producto)
        prod.id_producto = 1
        prod.nombre = "Último"
        prod.precio = Decimal("99.00")
        prod.stock_actual = 1
        prod.estado = True

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = prod
        mock_session.execute = AsyncMock(return_value=mock_result)

        session_add_calls: list = []
        mock_session.add.side_effect = lambda obj: session_add_calls.append(obj)

        async def flush_apply():
            for obj in session_add_calls:
                _apply_venta_defaults(obj)

        mock_session.flush.side_effect = flush_apply

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=1, cantidad=1)],
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )

        result = await service.create_checkout(id_cliente=1, dto=dto)
        assert result is not None

    async def test_cantidad_cero_rechazada_por_schema(self) -> None:
        with pytest.raises(Exception):
            ItemProducto(id_producto=1, cantidad=0)

    async def test_origen_venta_por_defecto(self, service, mock_session) -> None:
        prod = MagicMock()
        prod.id_producto = 1
        prod.nombre = "Test"
        prod.precio = Decimal("10.00")
        prod.stock_actual = 10
        prod.estado = True

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = prod
        mock_session.execute = AsyncMock(return_value=mock_result)

        session_add_calls: list = []
        mock_session.add.side_effect = lambda obj: session_add_calls.append(obj)

        async def flush_apply():
            for obj in session_add_calls:
                _apply_venta_defaults(obj)

        mock_session.flush.side_effect = flush_apply

        dto = VentaRequest(
            productos=[ItemProducto(id_producto=1, cantidad=1)],
            paquetes=[],
            tipo_pago=TipoPagoEnum.TARJETA,
        )

        await service.create_checkout(id_cliente=1, dto=dto)

        venta_obj = None
        for obj in session_add_calls:
            if type(obj).__name__ == "Venta":
                venta_obj = obj
                break

        assert venta_obj is not None
        assert venta_obj.origen_venta == OrigenVentaEnum.WEB


@pytest.fixture
def db_session_sample_product() -> MagicMock:
    from app.infrastructure.database.models.catalogo import Producto

    prod = MagicMock(spec=Producto)
    prod.id_producto = 1
    prod.nombre = "Trufa Belga Clásica"
    prod.precio = Decimal("5.50")
    prod.stock_actual = 50
    prod.estado = True
    return prod


@pytest.fixture
def mock_session() -> AsyncMock:
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.refresh = AsyncMock()

    class _Transaction:
        async def __aenter__(self):
            return None

        async def __aexit__(self, *args):
            return None

    session.begin = MagicMock(return_value=_Transaction())
    return session


@pytest.fixture
def mock_venta_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_paquete_repo() -> AsyncMock:
    repo = AsyncMock()
    repo.get_by_id = AsyncMock(return_value=None)
    return repo


@pytest.fixture
def service(mock_venta_repo, mock_paquete_repo, mock_session) -> VentaService:
    return VentaService(
        repo=mock_venta_repo,
        paquete_repo=mock_paquete_repo,
        session=mock_session,
    )
