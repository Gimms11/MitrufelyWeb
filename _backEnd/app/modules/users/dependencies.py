"""
Mitrufely Web — Users Module Dependencies
Provee el servicio de usuarios inyectable vía FastAPI Depends.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session
from app.modules.users.service import UsersService


def get_users_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> UsersService:
    """Factory del servicio de usuarios (una instancia por request)."""
    return UsersService(session=session)


UsersServiceDep = Annotated[UsersService, Depends(get_users_service)]
