from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session
from app.modules.products.repository_impl import PaqueteRepositoryImpl, ProductoRepositoryImpl
from app.modules.products.service import PaqueteService, ProductoService


def get_paquete_repository(session: AsyncSession = Depends(get_db_session)) -> PaqueteRepositoryImpl:
    return PaqueteRepositoryImpl(session)


def get_paquete_service(
    repo: PaqueteRepositoryImpl = Depends(get_paquete_repository),
) -> PaqueteService:
    return PaqueteService(repo)


def get_producto_repository(session: AsyncSession = Depends(get_db_session)) -> ProductoRepositoryImpl:
    return ProductoRepositoryImpl(session)


def get_producto_service(
    repo: ProductoRepositoryImpl = Depends(get_producto_repository),
) -> ProductoService:
    return ProductoService(repo)
