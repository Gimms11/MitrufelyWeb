"""
Tests unitarios para ReviewService — RU-01

Valida las reglas de negocio de creación de calificaciones y cálculo de métricas
usando mocks de AsyncSession para aislar de la base de datos real.
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.modules.reviews.schemas import CreateReviewRequest, ReviewMetricsResponse
from app.modules.reviews.service import ReviewService


@pytest.fixture
def mock_session() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def valid_dto() -> CreateReviewRequest:
    return CreateReviewRequest(rating=5, comment="Excelentes trufas!")


# ─── crear_review ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_crear_review_venta_no_existe(mock_session: AsyncMock, valid_dto: CreateReviewRequest):
    """Lanza NotFoundError si la venta no existe."""
    # Simular que no se encuentra la venta
    venta_result = MagicMock()
    venta_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=venta_result)

    service = ReviewService(mock_session)

    with pytest.raises(NotFoundError, match="no encontrada"):
        await service.crear_review(id_venta=9999, id_usuario=1, dto=valid_dto)


@pytest.mark.asyncio
async def test_crear_review_venta_no_entregada(mock_session: AsyncMock, valid_dto: CreateReviewRequest):
    """Lanza BusinessRuleError si la venta no está en estado ENTREGADO."""
    from app.infrastructure.database.models.enums import EstadoVentaEnum

    fake_venta = MagicMock()
    fake_venta.estado = EstadoVentaEnum.PENDIENTE
    fake_venta.id_cliente = 1

    venta_result = MagicMock()
    venta_result.scalar_one_or_none.return_value = fake_venta
    mock_session.execute = AsyncMock(return_value=venta_result)

    service = ReviewService(mock_session)

    with pytest.raises(BusinessRuleError, match="entregados"):
        await service.crear_review(id_venta=1, id_usuario=1, dto=valid_dto)


@pytest.mark.asyncio
async def test_crear_review_cliente_no_dueno(mock_session: AsyncMock, valid_dto: CreateReviewRequest):
    """Lanza BusinessRuleError si el cliente no es dueño del pedido."""
    from app.infrastructure.database.models.enums import EstadoVentaEnum

    fake_venta = MagicMock()
    fake_venta.estado = EstadoVentaEnum.ENTREGADO
    fake_venta.id_cliente = 99  # El dueño es otro cliente

    fake_cliente = MagicMock()
    fake_cliente.id_cliente = 1  # El solicitante tiene otro id_cliente

    venta_result = MagicMock()
    venta_result.scalar_one_or_none.return_value = fake_venta

    cliente_result = MagicMock()
    cliente_result.scalar_one_or_none.return_value = fake_cliente

    mock_session.execute = AsyncMock(side_effect=[venta_result, cliente_result])

    service = ReviewService(mock_session)

    with pytest.raises(BusinessRuleError, match="no es tuyo"):
        await service.crear_review(id_venta=1, id_usuario=2, dto=valid_dto)


@pytest.mark.asyncio
async def test_crear_review_ya_calificado(mock_session: AsyncMock, valid_dto: CreateReviewRequest):
    """Lanza BusinessRuleError si el pedido ya tiene calificación."""
    from app.infrastructure.database.models.enums import EstadoVentaEnum

    fake_venta = MagicMock()
    fake_venta.estado = EstadoVentaEnum.ENTREGADO
    fake_venta.id_cliente = 1

    fake_cliente = MagicMock()
    fake_cliente.id_cliente = 1

    fake_existing_review = MagicMock()  # Ya existe una calificación

    venta_result = MagicMock()
    venta_result.scalar_one_or_none.return_value = fake_venta

    cliente_result = MagicMock()
    cliente_result.scalar_one_or_none.return_value = fake_cliente

    existing_result = MagicMock()
    existing_result.scalar_one_or_none.return_value = fake_existing_review

    mock_session.execute = AsyncMock(
        side_effect=[venta_result, cliente_result, existing_result]
    )

    service = ReviewService(mock_session)

    with pytest.raises(BusinessRuleError, match="ya fue calificado"):
        await service.crear_review(id_venta=1, id_usuario=1, dto=valid_dto)


# ─── get_metrics ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_metrics_calcula_distribucion():
    """Verifica que get_metrics calcule correctamente la distribución de estrellas."""
    mock_session = AsyncMock()

    # Total reviews
    mock_session.scalar = AsyncMock(side_effect=[25, 4.2])

    # Distribución
    dist_result = MagicMock()
    dist_result.__iter__ = MagicMock(
        return_value=iter([(5, 10), (4, 8), (3, 5), (2, 1), (1, 1)])
    )
    mock_session.execute = AsyncMock(return_value=dist_result)

    service = ReviewService(mock_session)
    metrics = await service.get_metrics()

    assert isinstance(metrics, ReviewMetricsResponse)
    assert metrics.total_reviews == 25
    assert metrics.promedio_calificacion == 4.2
    assert metrics.distribucion_estrellas[5] == 10
    assert metrics.distribucion_estrellas[4] == 8
    assert metrics.distribucion_estrellas[1] == 1
