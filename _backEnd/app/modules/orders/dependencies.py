from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session
from app.modules.orders.repository_impl import VentaRepositoryImpl
from app.modules.orders.service import VentaService
from app.modules.products.repository_impl import PaqueteRepositoryImpl
from app.modules.products.dependencies import get_paquete_repository

def get_venta_repository(session: AsyncSession = Depends(get_db_session)) -> VentaRepositoryImpl:
    return VentaRepositoryImpl(session)

def get_venta_service(
    repo: VentaRepositoryImpl = Depends(get_venta_repository),
    paquete_repo: PaqueteRepositoryImpl = Depends(get_paquete_repository),
    session: AsyncSession = Depends(get_db_session)
) -> VentaService:
    return VentaService(repo, paquete_repo, session)
