"""
Mifrufely Web — Auth Service Unit Tests
Tests business logic in isolation (no real DB/Redis)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from app.core.exceptions import DuplicateResourceError, InvalidCredentialsError
from app.core.security import hash_password
from app.modules.auth.schemas import LoginRequest, RegisterRequest
from app.modules.auth.service import AuthService


@pytest.mark.unit
class TestAuthService:

    @pytest.fixture
    def service(self, mock_auth_repo: AsyncMock) -> AuthService:
        mock_redis = AsyncMock()
        mock_redis.exists = AsyncMock(return_value=0)
        mock_redis.setex = AsyncMock(return_value=True)
        return AuthService(repository=mock_auth_repo, redis=mock_redis)

    async def test_login_invalid_credentials_raises(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        mock_auth_repo.get_by_email.return_value = None

        with pytest.raises(InvalidCredentialsError):
            await service.login(
                LoginRequest(email="unknown@test.com", password="WrongPass1!")
            )

    async def test_login_wrong_password_raises(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        fake_user = MagicMock()
        fake_user.id_usuario = 1
        fake_user.email = "user@test.com"
        fake_user.rol = MagicMock()
        fake_user.rol.nombre.value = "CLIENTE"
        fake_user.password_hash = hash_password("CorrectPass1!")
        mock_auth_repo.get_by_email.return_value = fake_user

        with pytest.raises(InvalidCredentialsError):
            await service.login(
                LoginRequest(email="user@test.com", password="WrongPass1!")
            )

    async def test_login_success_returns_tokens(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        fake_user = MagicMock()
        fake_user.id_usuario = 1
        fake_user.email = "user@test.com"
        fake_user.nombres = "Juan"
        fake_user.apellidos = "Pérez"
        fake_user.estado = True  # cuenta activa
        fake_user.auth_provider = "local"
        fake_user.rol = MagicMock()
        fake_user.rol.nombre.value = "CLIENTE"
        fake_user.password_hash = hash_password("Correct1!")
        mock_auth_repo.get_by_email.return_value = fake_user

        result = await service.login(
            LoginRequest(email="user@test.com", password="Correct1!")
        )

        assert result.access_token
        assert result.refresh_token
        assert result.token_type == "bearer"

    async def test_register_duplicate_email_silent(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        mock_auth_repo.email_exists.return_value = True

        result = await service.register(
            RegisterRequest(
                first_name="Juan",
                last_name="Pérez",
                email="existing@test.com",
                password="ValidPass1!",
            ),
            background_tasks=MagicMock(),
        )
        assert result.user_id == 0
        assert result.email == "existing@test.com"

    async def test_register_success_client_sends_email(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        from app.infrastructure.database.models.usuarios import Rol
        from app.infrastructure.database.models.enums import TipoRolEnum

        mock_auth_repo.email_exists.return_value = False

        # Mock role query inside register
        mock_rol = MagicMock(spec=Rol)
        mock_rol.id_rol = 2
        mock_rol.nombre = TipoRolEnum.CLIENTE

        # Mock the session execute for the select statement
        mock_execute_result = MagicMock()
        mock_execute_result.scalar_one_or_none.return_value = mock_rol
        mock_auth_repo._session.execute = AsyncMock(return_value=mock_execute_result)

        # Mock repository create
        def mock_create(u):
            u.id_usuario = 1
            return u
        mock_auth_repo.create = AsyncMock(side_effect=mock_create)

        bg_tasks = MagicMock()

        result = await service.register(
            RegisterRequest(
                first_name="Juan",
                last_name="Pérez",
                email="juan@gmail.com",
                password="ValidPass1!",
            ),
            background_tasks=bg_tasks,
        )

        assert result.email == "juan@gmail.com"
        assert bg_tasks.add_task.called

    async def test_verify_email_success(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        from app.core.security import create_verification_token

        token = create_verification_token("123")

        fake_user = MagicMock()
        fake_user.id_usuario = 123
        fake_user.estado = False

        mock_auth_repo.get_by_id = AsyncMock(return_value=fake_user)
        mock_auth_repo.update = AsyncMock(return_value=fake_user)

        await service.verify_email(token)

        assert fake_user.estado is True
        assert mock_auth_repo.update.called

    async def test_get_me_success(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        fake_user = MagicMock()
        fake_user.id_usuario = 123
        fake_user.nombres = "Juan"
        fake_user.apellidos = "Pérez"
        fake_user.email = "juan@gmail.com"

        mock_auth_repo.get_by_id = AsyncMock(return_value=fake_user)

        user = await service.get_me(123)

        assert user == fake_user
        mock_auth_repo.get_by_id.assert_called_once_with(123)

    async def test_get_me_not_found_raises(
        self,
        service: AuthService,
        mock_auth_repo: AsyncMock,
    ) -> None:
        mock_auth_repo.get_by_id = AsyncMock(return_value=None)

        from app.core.exceptions import NotFoundError
        with pytest.raises(NotFoundError):
            await service.get_me(123)

