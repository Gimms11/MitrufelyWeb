"""
Tests unitarios para DashboardService — RU-01

Valida la lógica de cálculo de métricas del panel administrativo
usando mocks de AsyncSession para aislar de la base de datos real.
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.modules.dashboard.schemas import DashboardMetricsResponse
from app.modules.dashboard.service import DashboardService


@pytest.fixture
def mock_session() -> AsyncMock:
    """Crea un mock de AsyncSession que simula los resultados de las queries."""
    return AsyncMock()


def _build_estado_rows(estado_map: dict[str, int]):
    """Construye filas simuladas para la query de estados."""
    rows = []
    for estado, cantidad in estado_map.items():
        row = MagicMock()
        row.estado = MagicMock()
        row.estado.value = estado
        row.cantidad = cantidad
        rows.append(row)
    return rows


def _build_financiero_row(total: float, reembolsado: float, promedio: float):
    """Construye la fila simulada de la query financiera."""
    row = MagicMock()
    row.total_ventas = total
    row.total_reembolsado = reembolsado
    row.ticket_promedio = promedio
    return row


def _build_tiempo_row(avg_minutos: float | None):
    row = MagicMock()
    row.avg_minutos = avg_minutos
    return row


def _build_review_row(avg_rating: float | None, total: int):
    row = MagicMock()
    row.avg_rating = avg_rating
    row.total = total
    return row


@pytest.mark.asyncio
async def test_get_metrics_calcula_pedidos_totales(mock_session: AsyncMock):
    """Verifica que pedidos_totales sea la suma de todos los estados."""
    estado_map = {
        "PENDIENTE": 5,
        "PAGADO": 10,
        "ENTREGADO": 20,
        "CANCELADO": 3,
    }
    expected_total = sum(estado_map.values())

    # Configurar las respuestas mock de cada query en orden de ejecución
    estados_result = MagicMock()
    estados_result.__iter__ = MagicMock(return_value=iter(_build_estado_rows(estado_map)))

    financiero_result = MagicMock()
    financiero_result.one.return_value = _build_financiero_row(5000.0, 200.0, 125.0)

    tiempo_result = MagicMock()
    tiempo_result.one_or_none.return_value = _build_tiempo_row(45.5)

    top_result = MagicMock()
    top_result.__iter__ = MagicMock(return_value=iter([]))

    dia_result = MagicMock()
    dia_result.__iter__ = MagicMock(return_value=iter([]))

    reviews_result = MagicMock()
    reviews_result.one_or_none.return_value = _build_review_row(4.2, 15)

    issues_result = MagicMock()
    issues_result.scalar_one_or_none.return_value = 2

    mock_session.execute = AsyncMock(
        side_effect=[
            estados_result,
            financiero_result,
            tiempo_result,
            top_result,
            dia_result,
            reviews_result,
            issues_result,
        ]
    )

    service = DashboardService(mock_session)
    metrics = await service.get_metrics()

    assert isinstance(metrics, DashboardMetricsResponse)
    assert metrics.pedidos_totales == expected_total
    assert metrics.pedidos_pendientes == 5
    assert metrics.pedidos_entregados == 20
    assert metrics.pedidos_cancelados == 3


@pytest.mark.asyncio
async def test_get_metrics_ticket_promedio_decimal(mock_session: AsyncMock):
    """Verifica que ticket_promedio se cuantifique a 2 decimales."""
    estado_map = {"PAGADO": 1}

    estados_result = MagicMock()
    estados_result.__iter__ = MagicMock(return_value=iter(_build_estado_rows(estado_map)))

    financiero_result = MagicMock()
    financiero_result.one.return_value = _build_financiero_row(333.333, 0, 333.333)

    tiempo_result = MagicMock()
    tiempo_result.one_or_none.return_value = _build_tiempo_row(None)

    top_result = MagicMock()
    top_result.__iter__ = MagicMock(return_value=iter([]))

    dia_result = MagicMock()
    dia_result.__iter__ = MagicMock(return_value=iter([]))

    reviews_result = MagicMock()
    reviews_result.one_or_none.return_value = _build_review_row(None, 0)

    issues_result = MagicMock()
    issues_result.scalar_one_or_none.return_value = 0

    mock_session.execute = AsyncMock(
        side_effect=[
            estados_result,
            financiero_result,
            tiempo_result,
            top_result,
            dia_result,
            reviews_result,
            issues_result,
        ]
    )

    service = DashboardService(mock_session)
    metrics = await service.get_metrics()

    # ticket_promedio debe tener exactamente 2 decimales
    assert metrics.ticket_promedio == Decimal("333.33")


@pytest.mark.asyncio
async def test_get_metrics_tiempo_promedio_none(mock_session: AsyncMock):
    """Verifica que tiempo_promedio sea None cuando no hay entregas."""
    estado_map = {"PENDIENTE": 1}

    estados_result = MagicMock()
    estados_result.__iter__ = MagicMock(return_value=iter(_build_estado_rows(estado_map)))

    financiero_result = MagicMock()
    financiero_result.one.return_value = _build_financiero_row(100.0, 0, 100.0)

    tiempo_result = MagicMock()
    tiempo_result.one_or_none.return_value = _build_tiempo_row(None)

    top_result = MagicMock()
    top_result.__iter__ = MagicMock(return_value=iter([]))

    dia_result = MagicMock()
    dia_result.__iter__ = MagicMock(return_value=iter([]))

    reviews_result = MagicMock()
    reviews_result.one_or_none.return_value = _build_review_row(None, 0)

    issues_result = MagicMock()
    issues_result.scalar_one_or_none.return_value = 0

    mock_session.execute = AsyncMock(
        side_effect=[
            estados_result,
            financiero_result,
            tiempo_result,
            top_result,
            dia_result,
            reviews_result,
            issues_result,
        ]
    )

    service = DashboardService(mock_session)
    metrics = await service.get_metrics()

    assert metrics.tiempo_promedio_entrega_minutos is None


@pytest.mark.asyncio
async def test_get_metrics_productos_top_vacio(mock_session: AsyncMock):
    """Verifica que devuelve lista vacía de productos top cuando no hay ventas."""
    estado_map = {}

    estados_result = MagicMock()
    estados_result.__iter__ = MagicMock(return_value=iter(_build_estado_rows(estado_map)))

    financiero_result = MagicMock()
    financiero_result.one.return_value = _build_financiero_row(0, 0, 0)

    tiempo_result = MagicMock()
    tiempo_result.one_or_none.return_value = _build_tiempo_row(None)

    top_result = MagicMock()
    top_result.__iter__ = MagicMock(return_value=iter([]))

    dia_result = MagicMock()
    dia_result.__iter__ = MagicMock(return_value=iter([]))

    reviews_result = MagicMock()
    reviews_result.one_or_none.return_value = _build_review_row(None, 0)

    issues_result = MagicMock()
    issues_result.scalar_one_or_none.return_value = 0

    mock_session.execute = AsyncMock(
        side_effect=[
            estados_result,
            financiero_result,
            tiempo_result,
            top_result,
            dia_result,
            reviews_result,
            issues_result,
        ]
    )

    service = DashboardService(mock_session)
    metrics = await service.get_metrics()

    assert metrics.productos_mas_vendidos == []
    assert metrics.pedidos_totales == 0
