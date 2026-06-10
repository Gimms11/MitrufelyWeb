"""
Mifrufely Web — Auth Router
FastAPI APIRouter for /auth endpoints
"""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status
from fastapi.responses import JSONResponse
from redis.asyncio import Redis

from app.core.config import settings
from app.infrastructure.cache.redis_client import get_redis
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import (
    DatosFiscalesResponse,
    DatosFiscalesUpsert,
    GoogleLoginRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserMeResponse,
    UserProfileUpdate,
)
from app.modules.auth.service import AuthService
from app.security.dependencies import AuthUser

router = APIRouter(prefix="/auth", tags=["Authentication"])

AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
RedisDep = Annotated[Redis, Depends(get_redis)]


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión (email + contraseña)",
)
async def login(
    payload: LoginRequest,
    service: AuthServiceDep,
    redis: RedisDep,
    request: Request,
) -> TokenResponse | JSONResponse:
    """Authenticate user with email/password and return JWT access + refresh tokens."""
    # ── Rate Limiting por IP ──────────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"login_attempts:{client_ip}"
    attempts = await redis.incr(rate_key)
    if attempts == 1:
        # Primera vez: establecer TTL de la ventana deslizante
        await redis.expire(rate_key, settings.LOGIN_RATE_LIMIT_WINDOW_SECONDS)

    if attempts > settings.LOGIN_RATE_LIMIT_ATTEMPTS:
        ttl = await redis.ttl(rate_key)
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": (
                        f"Demasiados intentos de inicio de sesión. "
                        f"Intenta de nuevo en {ttl} segundos."
                    ),
                }
            },
        )

    return await service.login(payload)


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar nuevo cliente",
)
async def register(
    payload: RegisterRequest,
    service: AuthServiceDep,
    background_tasks: BackgroundTasks,
) -> RegisterResponse:
    """Create a new client account."""
    return await service.register(payload, background_tasks)


@router.post(
    "/google",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Iniciar sesión o registrarse con Google",
)
async def google_auth(
    payload: GoogleLoginRequest,
    service: AuthServiceDep,
) -> TokenResponse:
    """
    Verifica un ID Token de Google obtenido en el frontend.

    - Si el usuario ya existe: inicia sesión directamente y retorna tokens JWT.
    - Si el usuario no existe: lo registra automáticamente (estado=True, sin email de verificación)
      y retorna tokens JWT.

    El frontend debe enviar el `credential` devuelto por Google Identity Services.
    """
    return await service.login_or_register_with_google(payload)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Renovar access token",
)
async def refresh_token(
    payload: RefreshTokenRequest,
    service: AuthServiceDep,
) -> TokenResponse:
    """Exchange a valid refresh token for a new access token."""
    return await service.refresh(payload)


@router.get(
    "/verify",
    status_code=status.HTTP_200_OK,
    summary="Verificar cuenta de usuario",
)
async def verify_account(
    token: str,
    service: AuthServiceDep,
) -> dict[str, str]:
    """Verify user account using the token sent via email."""
    await service.verify_email(token)
    return {"message": "Cuenta verificada exitosamente. Ya puedes iniciar sesión."}


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Cerrar sesión",
)
async def logout(
    current_user: AuthUser,
    redis: Annotated[Redis, Depends(get_redis)],
) -> None:
    """
    Log out the user by adding their active JWT to the Redis blocklist.
    """
    from datetime import datetime, timezone

    # Calcular el tiempo de vida restante del JWT
    remaining_ttl = int(current_user.exp - datetime.now(tz=timezone.utc).timestamp())
    if remaining_ttl > 0:
        blocklist_key = f"token_blocklist:{current_user.token}"
        # Registrar en Redis con expiración igual a la vida útil restante del token
        await redis.setex(blocklist_key, remaining_ttl, "revoked")
    return None


@router.get(
    "/me",
    response_model=UserMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener perfil del usuario autenticado",
)
async def get_me(
    current_user: AuthUser,
    service: AuthServiceDep,
) -> UserMeResponse:
    """Retrieve the current user profile from the database using JWT subject."""
    db_user = await service.get_me(current_user.user_id)
    return db_user


@router.get(
    "/me/datos-fiscales",
    response_model=DatosFiscalesResponse | None,
    status_code=status.HTTP_200_OK,
    summary="Obtener datos fiscales del usuario",
)
async def get_datos_fiscales(
    current_user: AuthUser,
    service: AuthServiceDep,
):
    """Retrieve the user's default fiscal data, or None if not set."""
    return await service.get_datos_fiscales(current_user.user_id)


@router.post(
    "/me/datos-fiscales",
    response_model=DatosFiscalesResponse,
    status_code=status.HTTP_200_OK,
    summary="Crear o actualizar datos fiscales",
)
async def upsert_datos_fiscales(
    payload: DatosFiscalesUpsert,
    current_user: AuthUser,
    service: AuthServiceDep,
):
    """Create or update the user's fiscal data (DNI/RUC)."""
    return await service.upsert_datos_fiscales(current_user.user_id, payload)


@router.put(
    "/me",
    response_model=UserMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar perfil del usuario",
)
async def update_me(
    payload: UserProfileUpdate,
    current_user: AuthUser,
    service: AuthServiceDep,
):
    """Update user profile fields: phone, address, reference."""
    db_user = await service.update_me(current_user.user_id, payload)
    return db_user
