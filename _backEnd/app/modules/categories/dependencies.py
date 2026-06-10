from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session
from app.modules.categories.repository_impl import CategoriaRepositoryImpl
from app.modules.categories.service import CategoriaService


def get_categoria_repository(
    session: AsyncSession = Depends(get_db_session),
) -> CategoriaRepositoryImpl:
    return CategoriaRepositoryImpl(session)


def get_categoria_service(
    repo: CategoriaRepositoryImpl = Depends(get_categoria_repository),
) -> CategoriaService:
    return CategoriaService(repo)
