"""
Mifrufely Web — Pytest Configuration
Shared fixtures for all test suites

Key design decisions:
  - asyncio_default_fixture_loop_scope = "function" (pyproject.toml) means a
    fresh event loop is created per test. We must NOT retain cross-loop state.
  - The production database_engine uses a QueuePool. Sharing it across function
    scoped loops causes 'Event loop is closed' errors during pool teardown.
  - Solution: override `get_db_session` with a NullPool engine per-test so
    every test creates and destroys its own connection safely.
  - Redis is unavailable outside Docker: mocked globally with autouse=True.
"""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.infrastructure.database.session import _async_url, _connect_args
from app.infrastructure.database.session import get_db_session
from app.main import app


# ── Event Loop ────────────────────────────────────────────────────────────────
# asyncio_default_fixture_loop_scope = "function" (pyproject.toml) manages the
# loop lifecycle automatically. No custom event_loop fixture needed.


# ── Redis Mock (global, autouse) ──────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_redis_blocklist():
    """
    Mock global del cliente Redis para todos los tests.
    Fuera de Docker, Redis no está disponible localmente.
    Este fixture evita ConnectionError en endpoints protegidos por JWT.
    Simula una blocklist vacía (ningún token está revocado).

    Nota técnica: redis_client se importa con lazy-import dentro de
    get_current_user. El patch debe apuntar al objeto en su módulo de origen.
    """
    mock_redis = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=0)   # ningún token bloqueado
    mock_redis.setex = AsyncMock(return_value=True)

    with patch(
        "app.infrastructure.cache.redis_client.redis_client",
        new=mock_redis,
    ):
        yield mock_redis


# ── NullPool Session Override (E2E tests) ─────────────────────────────────────

@pytest_asyncio.fixture
async def override_get_db_session() -> AsyncGenerator[None, None]:
    """
    For E2E tests that hit the FastAPI app via HTTPX, we override the
    get_db_session dependency to use a NullPool engine.
    This avoids 'Event loop is closed' errors caused by the production
    QueuePool retaining connections across function-scoped event loops.
    """
    nullpool_engine = create_async_engine(
        _async_url,
        echo=False,
        connect_args=_connect_args,
        poolclass=NullPool,
    )
    NullPoolSession = async_sessionmaker(
        bind=nullpool_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async def _override_session() -> AsyncGenerator[AsyncSession, None]:
        async with NullPoolSession() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db_session] = _override_session
    yield
    app.dependency_overrides.pop(get_db_session, None)
    await nullpool_engine.dispose()


# ── HTTP Test Client ──────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(override_get_db_session: None) -> AsyncGenerator[AsyncClient, None]:
    """
    Async HTTPX client bound to the FastAPI app (no real server needed).
    Uses NullPool session override to prevent event-loop leaks.
    """
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url=f"http://testserver{settings.API_V1_PREFIX}",
    ) as ac:
        yield ac


# ── Auth Helpers ──────────────────────────────────────────────────────────────

@pytest.fixture
def admin_token() -> str:
    from app.core.security import create_access_token
    return create_access_token(
        subject="1",
        role="ADMIN",
        extra={"email": "admin@mitrufely.com", "nombres": "Admin", "apellidos": "Test"},
    )


@pytest.fixture
def client_token() -> str:
    from app.core.security import create_access_token
    return create_access_token(
        subject="2",
        role="CLIENTE",
        extra={"email": "cliente@test.com", "nombres": "Cliente", "apellidos": "Test"},
    )


@pytest.fixture
def auth_headers_admin(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def auth_headers_client(client_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {client_token}"}


# ── Mock Repository ───────────────────────────────────────────────────────────

@pytest.fixture
def mock_auth_repo() -> AsyncMock:
    """Mock AbstractAuthRepository for unit testing services."""
    repo = AsyncMock()
    repo.get_by_email = AsyncMock(return_value=None)
    repo.email_exists = AsyncMock(return_value=False)
    repo.get_by_id = AsyncMock(return_value=None)
    return repo
