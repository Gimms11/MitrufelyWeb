# Plan: Implementación de Recuperación de Contraseña

## Decisiones de diseño (confirmadas)
- **Post-reset**: ir al login manualmente (pantalla de éxito + enlace a `/login`).
- **Cuentas Google**: respuesta silenciosa genérica (anti-enumeración) — siempre 200, nunca revela si el email existe.
- **Token**: JWT de un solo uso con JTI en Redis (patrón idéntico al refresh token rotation existente), expiración **15 minutos**.

## Arquitectura del flujo
```
[ForgotPasswordPage] →POST /auth/forgot-password {email} → 200 siempre
                                          │
                ┌─────────────────────────┼────────────────────┐
                ▼ (existe y es local)     ▼ (no existe)        ▼ (es Google)
         EmailService.send_password_reset_email   (silencioso, no envía nada)
                │
                ▼ usuario hace clic en el enlace del correo
[ResetPasswordPage?token=...] →POST /auth/reset-password {token, new_password}
                                          │
                              valida token + JTI no usado en Redis
                              marca JTI como usado (TTL = vida restante)
                              actualiza password_hash
                                          │
                                          ▼
                              200 {message} → pantalla éxito → enlace a /login
```

---

## PARTE 1 — BACKEND (5 archivos)

### 1.1 `app/core/security.py` — nuevo helper de token
Agregar función siguiendo el patrón exacto de `create_verification_token`:
```python
def create_password_reset_token(subject: str) -> str:
    payload = _build_payload(
        subject=subject,
        extra={"type": "password_reset"},
        expires_delta=timedelta(minutes=15),
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
```
**Nota**: no incluimos JTI aquí — el JTI se necesita para invalidar tokens de un solo uso. Generar JTI dentro de esta función y devolverlo junto con el token, O mantener la firma simple y generar el JTI en el servicio. **Decisión**: agregar `jti` dentro del payload (como `create_refresh_token`), y el servicio lo extrae con `decode_token`. Devuelve solo el token (string); el servicio hace `decode_token(token)["jti"]`.

### 1.2 `app/core/config.py` — nueva setting
Agregar a la sección de Rate Limiting:
```python
PASSWORD_RESET_RATE_LIMIT_ATTEMPTS: int = Field(3, description="Max forgot-password requests per window")
PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS: int = Field(3600, description="Rate limit window (1h)")
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = Field(15, description="Reset token validity")
```
Y en `app/core/security.py` usar `settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` en vez del literal `15`.

### 1.3 `app/modules/auth/schemas.py` — 2 nuevos schemas
```python
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        # Reutilizar la misma lógica de RegisterRequest.validate_password_strength
        ...
```

### 1.4 `app/infrastructure/email/service.py` — nuevo método + plantilla
Agregar `send_password_reset_email(to_email, token, user_name)` clonando `send_verification_email`. Diferencias:
- Asunto: "🔐 Restablece tu contraseña en Mitrufely Web"
- `reset_link = f"{frontend_url}/reset-password?token={token}"`
- Texto del cuerpo adaptado ("Recibimos una solicitud para restablecer tu contraseña... Este enlace expira en 15 minutos...")
- Mismo HTML/plantilla visual (paleta pastel) con botón "Restablecer Mi Contraseña".

### 1.5 `app/modules/auth/service.py` — 2 nuevos métodos en `AuthService`

```python
async def request_password_reset(self, payload: ForgotPasswordRequest, background_tasks: BackgroundTasks) -> None:
    """Anti-enumeración: NUNCA levanta excepción. Busca usuario y envía correo solo si aplica."""
    user = await self._repo.get_by_email(payload.email)
    # Condición de envío: existe, auth_provider==local, y tiene password_hash
    if user and user.auth_provider == AuthProviderEnum.LOCAL.value and user.password_hash:
        reset_token = create_password_reset_token(str(user.id_usuario))
        background_tasks.add_task(
            EmailService.send_password_reset_email,
            to_email=user.email,
            token=reset_token,
            user_name=f"{user.nombres} {user.apellidos}",
        )
        logger.info("auth.password_reset.requested", user_id=user.id_usuario)
    # En todos los demás casos (no existe, o es Google): silencioso, sin log de existencia.

async def reset_password(self, payload: ResetPasswordRequest) -> None:
    token_data = decode_token(payload.token)
    if token_data.get("type") != "password_reset":
        raise InvalidTokenError("Token inválido para restablecer contraseña")

    jti = token_data.get("jti")
    if jti:
        redis_key = f"pwreset_used:{jti}"
        if await self._redis.exists(redis_key):
            logger.warning("auth.password_reset.replay_detected", jti=jti)
            raise InvalidTokenError("Este enlace ya fue utilizado. Solicita uno nuevo.")
        exp = token_data.get("exp", 0)
        remaining_ttl = int(exp - datetime.now(tz=timezone.utc).timestamp())
        if remaining_ttl > 0:
            await self._redis.setex(redis_key, remaining_ttl, "used")

    user = await self._repo.get_by_id(int(token_data["sub"]))
    if not user:
        raise NotFoundError("Usuario no encontrado")

    user.password_hash = hash_password(payload.new_password)
    await self._repo.update(user)
    logger.info("auth.password_reset.success", user_id=user.id_usuario)
```

### 1.6 `app/modules/auth/router.py` — 2 nuevos endpoints

```python
@router.post("/forgot-password", status_code=200, summary="Solicitar enlace de recuperación")
async def forgot_password(
    payload: ForgotPasswordRequest,
    service: AuthServiceDep,
    background_tasks: BackgroundTasks,
    redis: RedisDep,
    request: Request,
) -> dict[str, str]:
    # Rate limiting por IP (mismo patrón del login)
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"pwreset_attempts:{client_ip}"
    attempts = await redis.incr(rate_key)
    if attempts == 1:
        await redis.expire(rate_key, settings.PASSWORD_RESET_RATE_LIMIT_WINDOW_SECONDS)
    if attempts > settings.PASSWORD_RESET_RATE_LIMIT_ATTEMPTS:
        ttl = await redis.ttl(rate_key)
        return JSONResponse(status_code=429, content={"error": {...}})

    await service.request_password_reset(payload, background_tasks)
    # Respuesta SIEMPRE idéntica (anti-enumeración)
    return {"message": "Si el correo está registrado, recibirás un enlace de recuperación en breve."}


@router.post("/reset-password", status_code=200, summary="Restablecer contraseña")
async def reset_password(
    payload: ResetPasswordRequest,
    service: AuthServiceDep,
) -> dict[str, str]:
    await service.reset_password(payload)
    return {"message": "Contraseña restablecida exitosamente. Ya puedes iniciar sesión."}
```

### 1.7 Importaciones a ajustar
- `service.py`: importar `create_password_reset_token`, `hash_password`, `BackgroundTasks` (ya importado), `ForgotPasswordRequest`, `ResetPasswordRequest`, `datetime/timezone`.
- `router.py`: importar los 2 schemas nuevos y `Request` (ya importado).

---

## PARTE 2 — FRONTEND (6 archivos modificados/creados)

### 2.1 `src/features/auth/api/auth.api.ts` — 2 métodos nuevos
```ts
requestPasswordReset: async (email: string): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
  return data
},
resetPassword: async (payload: { token: string; new_password: string }): Promise<{ message: string }> => {
  const { data } = await api.post<{ message: string }>('/auth/reset-password', payload)
  return data
},
```

### 2.2 `src/features/auth/hooks/useForgotPassword.ts` (nuevo)
Patrón `useMutation`, onSuccess muestra toast genérico y resetea form (sin navegación — el usuario debe revisar su correo).

### 2.3 `src/features/auth/hooks/useResetPassword.ts` (nuevo)
Patrón minimalista como `useVerifyAccount` (sin onSuccess/onError — la página maneja estados).

### 2.4 `src/features/auth/pages/ForgotPasswordPage.tsx` (nueva)
- Copia el estilo de `RegisterPage.tsx` (paleta `#f0efed` / `#e6e6e6` / `#5c0f1b` / `#ff7a45`, sparkles background, Outfit font).
- Un solo campo: email (con icono `Mail`, zod `z.string().email()`).
- Botón "Enviar enlace de recuperación".
- Enlace "Volver a iniciar sesión" → `/login`.
- Tras enviar: mostrar mensaje de confirmación genérico en pantalla (no toast), estilo "Si el correo existe, recibirás un enlace".

### 2.5 `src/features/auth/pages/ResetPasswordPage.tsx` (nueva)
- Copia la estructura de 4 estados de `VerifyPage.tsx` (AnimatePresence, cardVariants).
- Lee `?token=` de `useSearchParams`.
- Si hay token: muestra formulario con 2 campos (nueva contraseña + confirmar contraseña) con zod `.refine` de igualdad.
- Al enviar → llama `useResetPassword` → estados loading/success/error.
- Success: icono `CheckCircle2` emerald + botón "Iniciar Sesión" → `/login`.
- Error: icono `XCircle` rose + mensaje de API + enlace "Solicitar nuevo enlace" → `/forgot-password`.
- No token: pantalla de error "Falta el token".

### 2.6 `src/app/router.tsx` — 2 rutas nuevas
```tsx
// Importar las 2 páginas con lazy()
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))

// Dentro de <Route element={<GuestOnly />}>:
<Route path="/forgot-password" element={<ForgotPasswordPage />} />

// Como ruta pública (igual que /verify), FUERA de GuestOnly:
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

### 2.7 `src/features/auth/pages/LoginPage.tsx` — reemplazar placeholder
Cambiar el `<a href="#" onClick={toast.info}>` actual (líneas 144-155) por:
```tsx
<Link to="/forgot-password" className="text-xs font-bold text-[#5c0f1b] hover:text-[#ff7a45] underline transition-colors">
  ¿Olvidaste tu contraseña?
</Link>
```
(Importar `Link` ya está presente en el archivo).

---

## PARTE 3 — VERIFICACIÓN

Al terminar, sin levantar servicios (no hay DB/Redis/SMTP en este entorno):
- **Backend**: `python -c "from app.modules.auth.service import AuthService"` + import del router para confirmar que no hay errores de sintaxis/importación circulares.
- **Frontend**: `npx tsc --noEmit` para validar tipos de los nuevos archivos.
- Revisar manualmente que las rutas y los nombres de endpoints coincidan entre FE y BE.

---

## Seguridad incluida (checklist)
- [x] Anti-enumeración: `/forgot-password` responde 200 siempre.
- [x] Rate limiting por IP en `/forgot-password` (3/hora configurable).
- [x] Token JWT de un solo uso con JTI en Redis (invalidación inmediata tras uso).
- [x] Expiración corta (15 min).
- [x] Bloqueo silencioso de cuentas Google (no pueden resetear, respuesta idéntica).
- [x] Validación de fortaleza de contraseña nueva (mayúscula + dígito + min 8).
- [x] Email enviado vía BackgroundTasks (no bloquea la request, no expone errores SMTP).

## Archivos totales: 11
**Backend (7):** `security.py`, `config.py`, `schemas.py`, `email/service.py`, `service.py`, `router.py` (+ verificación de imports)
**Frontend (5 nuevos + 2 edits = 7):** `auth.api.ts` (edit), `useForgotPassword.ts` (new), `useResetPassword.ts` (new), `ForgotPasswordPage.tsx` (new), `ResetPasswordPage.tsx` (new), `router.tsx` (edit), `LoginPage.tsx` (edit)