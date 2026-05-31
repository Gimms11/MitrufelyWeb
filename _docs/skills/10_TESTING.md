# SKILL 10 — Estrategia de Testing

> **CUÁNDO USAR:** Antes de escribir cualquier test unitario, de integración o E2E.

---

## 1. Stack de Testing

| Herramienta | Propósito |
|---|---|
| `pytest` | Test runner principal |
| `pytest-asyncio` | Soporte para tests async |
| `httpx` (AsyncClient) | HTTP client para tests E2E |
| `pytest-mock` | Mocking de dependencias |
| `factory-boy` | Factories de datos de prueba |
| `pytest-cov` | Coverage reports |

---

## 2. Estructura de Tests

```
tests/
├── conftest.py              # Fixtures globales: NullPool override, Redis mock, HTTP client
├── unit/                    # Tests de servicios puros (sin DB real)
│   ├── test_auth_service.py
│   ├── test_config.py
│   ├── test_paquete_service.py   ← [Fase 2] PaqueteService: precio, disponibilidad, CRUD
│   └── test_venta_service.py     ← [Fase 2] VentaService: checkout individual + paquetes
├── integration/             # Tests con DB real (NeonDB / asyncpg)
│   └── test_db_connection.py
└── e2e/                     # Tests de flujos completos HTTP
    ├── test_health.py
    └── test_packages_api.py      ← [Fase 2] 10 casos: RBAC, schema, filtrado, validaciones
```

---

## 3. conftest.py Global (Implementación Real)

> **⚠️ Consideraciones críticas de infraestructura:**
> - `asyncio_default_fixture_loop_scope = "function"` (pyproject.toml) crea un event loop por test.
> - El engine de producción usa `QueuePool` — compartirlo entre loops causa `RuntimeError: Event loop is closed`.
> - **Solución:** Override de `get_db_session` con un engine `NullPool` por test.
> - Redis no está disponible fuera de Docker — se mockea globalmente con `autouse=True`.

```python
# tests/conftest.py
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.infrastructure.database.session import _async_url, _connect_args, get_db_session
from app.main import app


# ── Redis Mock (global, autouse) ─────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_redis_blocklist():
    """Mock de Redis: evita ConnectionError fuera de Docker."""
    mock_redis = AsyncMock()
    mock_redis.exists = AsyncMock(return_value=0)  # ningún token bloqueado
    mock_redis.setex = AsyncMock(return_value=True)
    with patch("app.infrastructure.cache.redis_client.redis_client", new=mock_redis):
        yield mock_redis


# ── NullPool Session Override (E2E tests) ───────────────────────────────────

@pytest_asyncio.fixture
async def override_get_db_session() -> AsyncGenerator[None, None]:
    """Override get_db_session con NullPool para tests E2E."""
    nullpool_engine = create_async_engine(_async_url, connect_args=_connect_args, poolclass=NullPool)
    NullPoolSession = async_sessionmaker(bind=nullpool_engine, class_=AsyncSession,
                                          expire_on_commit=False, autocommit=False, autoflush=False)

    async def _override():
        async with NullPoolSession() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db_session] = _override
    yield
    app.dependency_overrides.pop(get_db_session, None)
    await nullpool_engine.dispose()


# ── HTTP Test Client ────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def client(override_get_db_session: None) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTPX client con NullPool override para evitar event-loop leaks."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url=f"http://testserver{settings.API_V1_PREFIX}",
    ) as ac:
        yield ac


# ── Auth helpers ───────────────────────────────────────────────────────────────

@pytest.fixture
def admin_token() -> str:
    from app.core.security import create_access_token
    return create_access_token(
        subject="1", role="ADMIN",
        extra={"email": "admin@mitrufely.com", "nombres": "Admin", "apellidos": "Test"}
    )

@pytest.fixture
def auth_headers_admin(admin_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {admin_token}"}

@pytest.fixture
def mock_auth_repo() -> AsyncMock:
    """Mock del AbstractAuthRepository."""
    repo = AsyncMock()
    repo.get_by_email = AsyncMock(return_value=None)
    repo.email_exists = AsyncMock(return_value=False)
    repo.get_by_id = AsyncMock(return_value=None)
    return repo
```

---

## 4. Tests Unitarios — Patrón Estándar

Los tests unitarios **mockean el repository** y prueban solo la lógica del service.

```python
# tests/unit/test_auth_service.py
import pytest
from unittest.mock import AsyncMock, patch
from app.modules.auth.service import AuthService
from app.core.exceptions import InvalidCredentialsError, DuplicateResourceError


class TestAuthService:
    @pytest.fixture
    def service(self, mock_auth_repo: AsyncMock) -> AuthService:
        return AuthService(repo=mock_auth_repo)

    @pytest.mark.asyncio
    async def test_login_invalid_email(self, service: AuthService, mock_auth_repo: AsyncMock):
        mock_auth_repo.get_by_email.return_value = None
        with pytest.raises(InvalidCredentialsError):
            await service.login(email="no@existe.com", password="pass")

    @pytest.mark.asyncio
    async def test_login_wrong_password(self, service: AuthService, mock_auth_repo: AsyncMock):
        mock_user = AsyncMock()
        mock_user.password_hash = "hashed_wrong"
        mock_user.estado = True
        mock_auth_repo.get_by_email.return_value = mock_user

        with patch("app.core.security.verify_password", return_value=False):
            with pytest.raises(InvalidCredentialsError):
                await service.login(email="user@test.com", password="wrong")

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, service: AuthService, mock_auth_repo: AsyncMock):
        mock_auth_repo.email_exists.return_value = True
        with pytest.raises(DuplicateResourceError):
            await service.register(
                nombres="Juan",
                apellidos="Pérez",
                email="duplicado@test.com",
                password="secure123",
            )
```

---

## 5. Tests de Checkout (Flujo Crítico)

```python
# tests/unit/test_order_service.py
class TestOrderService:
    @pytest.mark.asyncio
    async def test_checkout_insufficient_stock(self, service, mock_product_repo):
        """El service debe lanzar InsufficientStockError si el trigger falla."""
        import asyncpg
        mock_product_repo.get_by_id.return_value = MagicMock(
            estado=True, stock_actual=2
        )
        # Simular que el trigger lanza RAISE EXCEPTION
        mock_detalle_repo.create.side_effect = asyncpg.exceptions.RaiseException(
            "Stock insuficiente para el producto 1. Disponible: 2, solicitado: 5"
        )
        with pytest.raises(InsufficientStockError):
            await service.checkout(
                request=CheckoutRequest(items=[{"id_producto": 1, "cantidad": 5, ...}]),
                cliente_id=1,
            )

    @pytest.mark.asyncio
    async def test_checkout_invalid_coupon_owner(self, service, mock_cupon_repo):
        """El service rechaza cupones de otro cliente."""
        mock_cupon_repo.get_by_id.return_value = MagicMock(
            id_cliente=99,  # ≠ cliente_id=1
            estado="DISPONIBLE",
        )
        with pytest.raises(ForbiddenError):
            await service.checkout(
                request=CheckoutRequest(id_cupon_cliente=5, ...),
                cliente_id=1,
            )
```

---

## 6. Tests E2E — Flujo de Auth

```python
# tests/e2e/test_auth_flow.py
class TestAuthFlow:
    @pytest.mark.asyncio
    async def test_register_and_login(self, http_client: AsyncClient):
        # Register
        response = await http_client.post("/api/v1/auth/register", json={
            "nombres": "Ana",
            "apellidos": "García",
            "email": "ana@test.com",
            "password": "SecurePass123!",
        })
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True

        # Login
        response = await http_client.post("/api/v1/auth/login", json={
            "email": "ana@test.com",
            "password": "SecurePass123!",
        })
        assert response.status_code == 200
        tokens = response.json()["data"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens

    @pytest.mark.asyncio
    async def test_protected_endpoint_without_token(self, http_client: AsyncClient):
        response = await http_client.get("/api/v1/users/me/profile")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "UNAUTHORIZED"
```

---

## 7. pyproject.toml (Configuración Real)

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
asyncio_default_fixture_loop_scope = "function"  # CRTICO: function, no session
testpaths = ["tests"]
markers = [
    "unit: Tests sin base de datos real",
    "integration: Tests con DB real (requieren NeonDB)",
    "e2e: Tests de flujo HTTP completo",
]
```

> **⚠️ No usar `asyncio_default_fixture_loop_scope = "session"`**. El `QueuePool` de SQLAlchemy retiene
> conexiones entre loops causando `RuntimeError: Event loop is closed` en el teardown.

```bash
# Ejecutar solo unit tests (sin DB, rápido)
pytest -m "unit" -v

# Tests unitarios + E2E (con NullPool override, sin DB directa)
pytest -m "unit or e2e" -v

# Suite completa (requiere conexión NeonDB)
pytest -v

# Con cobertura
pytest --cov=app --cov-report=html -v
```

---

## 8. Convenciones de Naming

```python
# Formato: test_<acción>_<condición>_<resultado_esperado>
def test_login_invalid_email_raises_invalid_credentials(): ...
def test_checkout_insufficient_stock_raises_error(): ...
def test_register_duplicate_email_raises_conflict(): ...
def test_get_product_nonexistent_returns_not_found(): ...
```

---

## 9. Cobertura Mínima por Módulo

| Módulo | Cobertura mínima |
|---|---|
| `core/` | 95% |
| `modules/*/service.py` | 90% |
| `modules/*/schemas.py` | 80% |
| `security/dependencies.py` | 90% |
| `infrastructure/` | 70% |
