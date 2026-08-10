"""
Mifrufely Web — Dashboard Router
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.infrastructure.database.session import get_db_session
from app.modules.dashboard.schemas import DashboardMetricsResponse
from app.modules.dashboard.service import DashboardService
from app.security.dependencies import AdminUser

router = APIRouter(prefix="/admin/dashboard", tags=["Dashboard Administrativo"])


def get_dashboard_service(
    session: AsyncSession = Depends(get_db_session),
) -> DashboardService:
    return DashboardService(session=session)


DashboardServiceDep = Annotated[DashboardService, Depends(get_dashboard_service)]


@router.get(
    "/metrics",
    response_model=DashboardMetricsResponse,
    summary="Métricas completas del panel administrativo",
)
async def get_dashboard_metrics(
    current_user: AdminUser,
    service: DashboardServiceDep,
    dias: int = Query(default=30, ge=1, le=365, description="Número de días para tendencia de ventas"),
) -> DashboardMetricsResponse:
    """
    Retorna KPIs completos del negocio:
    conteo de pedidos por estado, totales financieros, top productos,
    tendencia de N días, calificaciones e incidencias activas.
    """
    return await service.get_metrics(dias=dias)
