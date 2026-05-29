"""
Mifrufely Web — Auth Service
Orchestrates authentication business logic.
No direct DB access — delegates to repository.
"""

from fastapi import BackgroundTasks
import structlog

from app.core.exceptions import DuplicateResourceError, InvalidCredentialsError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.infrastructure.database.models.usuarios import Usuario
from app.modules.auth.repository import AbstractAuthRepository
from app.modules.auth.schemas import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)

logger = structlog.get_logger(__name__)


class AuthService:
    """
    Authentication Service.
    Handles login, registration, and token refresh.
    All operations are async.
    """

    def __init__(self, repository: AbstractAuthRepository) -> None:
        self._repo = repository

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self._repo.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.password_hash):
            raise InvalidCredentialsError()

        # Reject unverified accounts (estado=False means pending email verification)
        if not user.estado:
            from app.core.exceptions import UnauthorizedError
            raise UnauthorizedError("Cuenta no verificada. Revisa tu correo electrónico para activar tu cuenta.")

        # user.rol is eagerly loaded via selectinload in the repository
        role_name = user.rol.nombre.value if user.rol else "CLIENTE"

        logger.info("auth.login.success", user_id=user.id_usuario, email=user.email)

        return TokenResponse(
            access_token=create_access_token(
                subject=str(user.id_usuario),
                role=role_name,
                extra={"email": user.email},
            ),
            refresh_token=create_refresh_token(subject=str(user.id_usuario)),
            expires_in=3600,
        )

    async def register(
        self,
        payload: RegisterRequest,
        background_tasks: BackgroundTasks,
    ) -> RegisterResponse:
        if await self._repo.email_exists(payload.email):
            raise DuplicateResourceError(f"El email '{payload.email}' ya está registrado")

        # Fetch the dynamic role to assign to the new user
        from sqlalchemy import select
        from app.infrastructure.database.models.usuarios import Rol, Cliente
        from app.infrastructure.database.models.enums import TipoRolEnum
        from app.core.config import settings

        # Determinar rol dinámicamente según dominio
        is_admin = payload.email.lower().endswith(f"@{settings.ADMIN_EMAIL_DOMAIN.lower()}")
        target_role = TipoRolEnum.ADMIN if is_admin else TipoRolEnum.CLIENTE

        # NOTE: We reach into the session via the repository's internal _session.
        stmt = select(Rol).where(Rol.nombre == target_role).limit(1)
        result = await self._repo._session.execute(stmt)  # type: ignore[attr-defined]
        rol_db = result.scalar_one_or_none()

        if rol_db is None:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(
                f"El rol {target_role.value} no existe en la base de datos. "
                "Inserta los roles base antes de registrar usuarios."
            )

        new_user = Usuario(
            id_rol=rol_db.id_rol,
            nombres=payload.first_name,
            apellidos=payload.last_name,
            email=payload.email,
            password_hash=hash_password(payload.password),
            telefono=payload.phone,
            estado=True if is_admin else False,
        )

        # Si el rol es CLIENTE, creamos atómicamente su perfil extendido
        if target_role == TipoRolEnum.CLIENTE:
            new_user.cliente = Cliente(
                direccion=None,
                referencia=None,
            )

        saved_user = await self._repo.create(new_user)

        logger.info("auth.register.success", user_id=saved_user.id_usuario, email=saved_user.email, role=target_role.value)

        # Si requiere verificación (rol CLIENTE), enviar correo de confirmación en segundo plano
        if target_role == TipoRolEnum.CLIENTE:
            from app.core.security import create_verification_token
            from app.infrastructure.email.service import EmailService

            verification_token = create_verification_token(str(saved_user.id_usuario))
            background_tasks.add_task(
                EmailService.send_verification_email,
                to_email=saved_user.email,
                token=verification_token,
                user_name=f"{saved_user.nombres} {saved_user.apellidos}",
            )

        return RegisterResponse(
            user_id=saved_user.id_usuario,
            email=saved_user.email,
        )

    async def refresh(self, payload: RefreshTokenRequest) -> TokenResponse:
        token_data = decode_token(payload.refresh_token)

        if token_data.get("type") != "refresh":
            from app.core.exceptions import InvalidTokenError
            raise InvalidTokenError("Solo se aceptan refresh tokens")

        user_id = token_data["sub"]
        user = await self._repo.get_by_id(int(user_id))

        if not user:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("Usuario no encontrado")

        role_name = user.rol.nombre.value if user.rol else "CLIENTE"

        return TokenResponse(
            access_token=create_access_token(
                subject=str(user.id_usuario),
                role=role_name,
                extra={"email": user.email},
            ),
            refresh_token=create_refresh_token(subject=str(user.id_usuario)),
            expires_in=3600,
        )

    async def verify_email(self, token: str) -> None:
        """
        Validates the verification token and activates the user account.
        All DB changes are flushed.
        """
        token_data = decode_token(token)

        if token_data.get("type") != "verification":
            from app.core.exceptions import InvalidTokenError
            raise InvalidTokenError("Token inválido para verificación de cuenta")

        user_id = token_data["sub"]
        user = await self._repo.get_by_id(int(user_id))

        if not user:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("Usuario no encontrado")

        if user.estado:
            # Already active
            return

        # Activate the user
        user.estado = True
        await self._repo.update(user)
        logger.info("auth.verification.success", user_id=user.id_usuario, email=user.email)

    async def get_me(self, user_id: int) -> Usuario:
        """
        Retrieve the current user by ID.
        Eagerly loads Rol via selectinload in the repository.
        """
        user = await self._repo.get_by_id(user_id)
        if not user:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("Usuario no encontrado")
        return user

