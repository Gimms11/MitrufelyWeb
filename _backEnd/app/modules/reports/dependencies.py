"""
Mitrufely Web — Reports Module Dependencies
Inyecta el ReportsService vía FastAPI Depends.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.session import get_db_session
from app.modules.reports.service import ReportsService


def get_reports_service(
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> ReportsService:
    return ReportsService(session=session)


ReportsServiceDep = Annotated[ReportsService, Depends(get_reports_service)]
