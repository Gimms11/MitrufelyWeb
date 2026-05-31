"""
Mifrufely Web — Auth Dependency Injection
Provides AuthService with its dependencies wired via FastAPI DI
"""

from typing import Annotated

from fastapi import Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.cache.redis_client import get_redis
from app.infrastructure.database.session import get_db_session
from app.modules.auth.repository import AbstractAuthRepository
from app.modules.auth.repository_impl import SQLAlchemyAuthRepository
from app.modules.auth.service import AuthService


async def get_auth_repository(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> AbstractAuthRepository:
    """
    Provide the concrete SQLAlchemy auth repository bound to the current request session.
    """
    return SQLAlchemyAuthRepository(session)


async def get_auth_service(
    repository: Annotated[AbstractAuthRepository, Depends(get_auth_repository)],
    redis: Annotated[Redis, Depends(get_redis)],
) -> AuthService:
    """Provide an AuthService with its repository and Redis dependencies injected."""
    return AuthService(repository=repository, redis=redis)
