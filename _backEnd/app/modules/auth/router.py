"""
Mifrufely Web — Auth Router
FastAPI APIRouter for /auth endpoints
"""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Request, status, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings
from app.infrastructure.cache.redis_client import get_redis
from app.infrastructure.storage.cloudinary_service import CloudinaryService, get_storage_service
from app.modules.auth.dependencies import get_auth_service
from app.modules.auth.schemas import (
    ChangePasswordRequest,
    DatosFiscalesResponse,
    DatosFiscalesUpsert,
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserMeResponse,
    UserProfileUpdate,
)
from app.modules.auth.service import AuthService
from app.security.dependencies import AuthUser

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Limiter local para aplicar límites específicos a endpoints sensibles de auth.
# El limiter global está registrado en main.py; aquí añadimos límites más
# estrictos para register/google/refresh (superan el default).
_limiter = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)

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
@_limiter.limit("5 per minute")
async def register(
    request: Request,
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
@_limiter.limit("10 per minute")
async def google_auth(
    request: Request,
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
@_limiter.limit("30 per minute")
async def refresh_token(
    request: Request,
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
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Solicitar enlace de recuperación de contraseña",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    service: AuthServiceDep,
    background_tasks: BackgroundTasks,
    redis: RedisDep,
    request: Request,
) -> dict[str, str]:
    """
    Envía un enlace de recuperación al correo del usuario (si existe y es cuenta local).

    Anti-enumeración: la respuesta es siempre idéntica, sin importar si el email
    está registrado o si corresponde a una cuenta Google.
    """
    # ── Rate Limiting por IP ──────────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"pwreset_attempts:{client_ip}"
    attempts = await redis.incr(rate_key)
    if attempts == 1:
        await redis.expire(rate_key, settings.PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS)

    if attempts > settings.PASSWORD_RESET_RATE_LIMIT_ATTEMPTS:
        ttl = await redis.ttl(rate_key)
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": {
                    "error_code": "RATE_LIMIT_EXCEEDED",
                    "message": (
                        f"Demasiadas solicitudes de recuperación. "
                        f"Intenta de nuevo en {ttl} segundos."
                    ),
                }
            },
        )

    await service.request_password_reset(payload, background_tasks)
    # Respuesta SIEMPRE idéntica (anti-enumeración)
    return {
        "message": "Si el correo está registrado, recibirás un enlace de recuperación en breve."
    }


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Restablecer contraseña",
)
async def reset_password(
    payload: ResetPasswordRequest,
    service: AuthServiceDep,
) -> dict[str, str]:
    """
    Restablece la contraseña usando el token enviado por correo.
    El token es de un solo uso y expira en 15 minutos.
    """
    await service.reset_password(payload)
    return {"message": "Contraseña restablecida exitosamente. Ya puedes iniciar sesión."}


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

@router.post(
    "/me/password",
    status_code=status.HTTP_200_OK,
    summary="Cambiar contraseña del usuario autenticado",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: AuthUser,
    service: AuthServiceDep,
):
    """Change user password. Requires current password validation."""
    await service.change_password(current_user.user_id, payload)
    return {"message": "Contraseña actualizada exitosamente."}

@router.post(
    "/me/avatar",
    response_model=UserMeResponse,
    status_code=status.HTTP_200_OK,
    summary="Subir o actualizar foto de perfil",
)
async def upload_avatar(
    current_user: AuthUser,
    service: AuthServiceDep,
    file: UploadFile = File(...),
    storage_service: CloudinaryService = Depends(get_storage_service),
) -> UserMeResponse:
    """Upload user avatar to storage and update user profile."""
    # Read file bytes
    file_bytes = await file.read()
    
    # Validation is mostly handled by storage_service.upload_image (5MB limit and format)
    # But let's add an explicit content-type check here just in case
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato de archivo no soportado. Usa JPG, PNG o WEBP."
        )
        
    upload_res = await storage_service.upload_image(
        file_bytes=file_bytes,
        filename=file.filename or f"avatar_{current_user.user_id}",
        content_type=file.content_type,
        folder="mitrufely/avatars"
    )
    
    avatar_url = upload_res["secure_url"]
    
    # Update user in DB
    updated_user = await service.update_avatar(current_user.user_id, avatar_url)
    
    return updated_user
