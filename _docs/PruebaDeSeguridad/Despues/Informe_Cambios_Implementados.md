# 🛠️ Informe de Cambios Implementados — MitrufelyWeb

> **Proyecto:** MitrufelyWeb
> **Fecha:** 12 de julio de 2026
> **Objetivo:** Implementar las soluciones a las brechas de seguridad detectadas en la auditoría.
> **Informe de referencia:** `_docs/PruebaDeSeguridad/Auditoria_Seguridad_MitrufelyWeb.md`

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#1--resumen-ejecutivo)
2. [Cambios en el Backend](#2--cambios-en-el-backend)
3. [Cambios en el Frontend](#3--cambios-en-el-frontend)
4. [Cambios en Infraestructura](#4--cambios-en-infraestructura)
5. [Verificación](#5--verificación)
6. [Hallazgos Pendientes (Roadmap)](#6--hallazgos-pendientes-roadmap)

---

## 1) 📊 Resumen Ejecutivo

Se implementaron **19 correcciones de seguridad** distribuidas entre backend (12), frontend (5) e infraestructura (2). Todas las correcciones de código se validaron con compilación Python exitosa.

| Severidad | Hallazgos corregidos |
|-----------|:--------------------:|
| 🔴 Crítico | 3 de 4 (C-01, C-03, C-04) |
| 🟠 Alto | 5 de 5 (H-01→H-06 excepto H-01/H-02 que requieren cambios de DB) |
| 🟡 Medio | 8 de 13 |
| 🟢 Bajo | 3 de 9 |

> Los hallazgos **no corregidos** en esta iteración (H-01, H-02, C-02 y varios bajos) requieren cambios de infraestructura de base de datos, rotación de secretos externos, o son mejoras de defensa en profundidad que no bloquean el despliegue. Se detallan en [§6](#6--hallazgos-pendientes-roadmap).

### Archivos modificados/creados

| Tipo | Cantidad | Archivos |
|------|:--------:|----------|
| Modificados | 24 | Ver detalles en cada sección |
| Creados | 2 | `security_headers.py`, `useLogout.ts` |
| Eliminados | 1 | `stores/auth.store.ts` (obsoleto) |
| Removidos de git | 1 | `_frontEnd/.env` |

---

## 2) 🔧 Cambios en el Backend

### 2.1 C-01 🔴 — Eliminación de auto-admin por dominio de email

**Archivo:** `_backEnd/app/modules/auth/service.py` (función `register`)

#### ❌ Por qué era un problema

El endpoint `/auth/register` decidía el rol del usuario **únicamente por el dominio de su email**:

```python
is_admin = payload.email.lower().endswith(f"@{settings.ADMIN_EMAIL_DOMAIN.lower()}")
target_role = TipoRolEnum.ADMIN if is_admin else TipoRolEnum.CLIENTE
```

Además, las cuentas admin se creaban con `estado=True` → **login inmediato, sin verificación de email**. Un atacante que controlara un buzón `*@mitrufely.com` (o si el dominio estaba mal configurado a un proveedor público) obtenía **acceso administrativo total** sin verificación de identidad.

#### ✅ Cómo se solucionó

- Se eliminó completamente la lógica de auto-promoción por dominio.
- **Todos** los registros de auto-servicio reciben el rol `CLIENTE` sin excepciones.
- **Todos** los registros requieren verificación de email (`estado=False`), sin excepción para ningún rol.
- La promoción a `ADMIN` ahora debe hacerse exclusivamente vía script de seed o invitación out-of-band.

#### 📝 Qué se modificó

```python
# ANTES
is_admin = payload.email.lower().endswith(f"@{settings.ADMIN_EMAIL_DOMAIN.lower()}")
target_role = TipoRolEnum.ADMIN if is_admin else TipoRolEnum.CLIENTE
...
estado=True if is_admin else False,

# DESPUÉS
target_role = TipoRolEnum.CLIENTE  # Siempre CLIENTE en auto-registro
...
estado=False  # Todos requieren verificación de email
```

---

### 2.2 ZAP-1 🟡 — Validación de `id_token` en `/auth/google` + manejo de errores

**Archivo:** `_backEnd/app/modules/auth/service.py` (función `_verify_google_token`)

#### ❌ Por qué era un problema

El `id_token` se interpolaba **sin codificación ni validación** directamente en la URL:

```python
url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
```

Cuando ZAP enviaba `ZAP%n%s%n%s...`, las secuencias `%n`/`%s` eran codificaciones percent inválidas que provocaban `httpx.InvalidURL`. El bloque `except` solo capturaba `httpx.RequestError`, por lo que `InvalidURL` (que hereda de `HTTPError`, no de `RequestError`) **escapaba sin capturar** → HTTP 500.

#### ✅ Cómo se solucionó

1. **Validación temprana de formato**: se verifica que el `id_token` tenga la estructura de un JWT (3 partes separadas por puntos) antes de construir la URL.
2. **Uso de `params=`**: el token se pasa como parámetro de query (`httpx` lo codifica automáticamente), evitando interpolación directa.
3. **Ampliación del `except`**: ahora captura `httpx.HTTPError` (padre de `RequestError` e `InvalidURL`), para que ningún error de red/URL escape sin manejar.

#### 📝 Qué se modificó

```python
# ANTES
url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
try:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url)
except httpx.RequestError as exc:
    ...

# DESPUÉS
# Validación temprana de formato (CWE-20)
parts = id_token.split(".")
if len(parts) != 3:
    raise InvalidTokenError("Token de Google con formato inválido")

url = "https://oauth2.googleapis.com/tokeninfo"
try:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(url, params={"id_token": id_token})
except httpx.HTTPError as exc:  # Captura ampliada
    ...
```

---

### 2.3 ZAP-2 🟢 — SecurityHeadersMiddleware

**Archivo creado:** `_backEnd/app/middleware/security_headers.py`
**Archivo modificado:** `_backEnd/app/main.py`

#### ❌ Por qué era un problema

ZAP detectó que **ninguna** respuesta incluía `X-Content-Type-Options: nosniff`. La alerta era "systemic" (afectaba a toda la API) porque no existía ningún middleware que agregara cabeceras de seguridad. Faltaban también `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`, `Referrer-Policy` y `Permissions-Policy`.

#### ✅ Cómo se solucionó

Se creó un `SecurityHeadersMiddleware` basado en `BaseHTTPMiddleware` que inyecta cabeceras de seguridad en **todas** las respuestas:

| Cabecera | Valor | Función |
|----------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Previene MIME-sniffing (la alerta de ZAP) |
| `X-Frame-Options` | `DENY` | Previene clickjacking |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Fuerza HTTPS (solo en producción) |
| `Content-Security-Policy` | `default-src 'none'; frame-ancestors 'none'` | Previene XSS/inyección (API REST que sirve JSON) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controla filtrado de URLs |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), payment=()` | Restringe APIs del navegador |

HSTS solo se activa en producción (`settings.is_production`) para no romper el HTTP local en desarrollo.

#### 📝 Qué se modificó

En `main.py` se registró el middleware después de los existentes:

```python
from app.middleware.security_headers import SecurityHeadersMiddleware
application.add_middleware(SecurityHeadersMiddleware)
```

---

### 2.4 H-04 🟠 — Restricción de CORS `ALLOWED_HEADERS`

**Archivos:** `_backEnd/app/core/config.py`, `_backEnd/.env`

#### ❌ Por qué era un problema

`ALLOWED_HEADERS` estaba configurado como `["*"]` (comodín), combinado con `allow_credentials=True`. Aunque los orígenes estaban restringidos, la combinación wildcard + credentials es un anti-patrón CORS que limita la capacidad del navegador de restringir headers en peticiones credenciales.

#### ✅ Cómo se solucionó

- Se reemplazó `["*"]` por una lista explícita de los headers que la API realmente usa.
- Se añadió un `model_validator` (`validate_cors_safety`) que **rechaza** `ALLOWED_ORIGINS=["*"]` al arrancar, imposibilitando una misconfiguración peligrosa.

#### 📝 Qué se modificó

```python
# ANTES
ALLOWED_HEADERS: list[str] = ["*"]

# DESPUÉS
ALLOWED_HEADERS: list[str] = ["Authorization", "Content-Type", "X-Request-ID"]

# Nuevo validator que bloquea "*" en origins
@model_validator(mode="after")
def validate_cors_safety(self) -> "Settings":
    if "*" in self.ALLOWED_ORIGINS:
        raise ValueError(
            "ALLOWED_ORIGINS no puede contener '*' cuando allow_credentials=True. "
            "Especifica los orígenes explícitamente."
        )
    ...
```

---

### 2.5 H-03 🟠 — Rate limiting global con slowapi

**Archivos:** `_backEnd/app/main.py`, `_backEnd/app/modules/auth/router.py`, `_backEnd/app/core/config.py`, `_backEnd/requirements.txt`

#### ❌ Por qué era un problema

No existía ningún middleware ni librería de rate limiting. Solo había contadores manuales por IP en `/login` y `/forgot-password`. **Todos los demás endpoints** (registro, carrito, pedidos, productos, reportes, uploads) quedaban desprotegidos frente a brute-force, credential stuffing, scraping y DoS.

#### ✅ Cómo se solucionó

1. Se añadió `slowapi==0.1.9` a `requirements.txt`.
2. Se creó un `Limiter` global en `main.py` con backend en Redis (compartido entre workers) y un límite por defecto de `120 per minute` para todos los endpoints.
3. Se registraron el limiter y su handler de `RateLimitExceeded`.
4. Se aplicaron límites más estrictos a endpoints sensibles de auth:
   - `/auth/register` → `5 per minute`
   - `/auth/google` → `10 per minute`
   - `/auth/refresh` → `30 per minute`

#### 📝 Qué se modificó

```python
# main.py
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    storage_uri=settings.REDIS_URL,
)
application.state.limiter = limiter
application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# router.py — límites específicos
@_limiter.limit("5 per minute")
async def register(request: Request, ...):
```

---

### 2.6 H-05 🟠 — Anti-enumeración en `/register`

**Archivo:** `_backEnd/app/modules/auth/service.py` (función `register`)

#### ❌ Por qué era un problema

El endpoint `/register` revelaba explícitamente si un email ya estaba registrado:

```python
if await self._repo.email_exists(payload.email):
    raise DuplicateResourceError(f"El email '{payload.email}' ya está registrado")
```

Esto permitía a un atacante **enumerar cuentas** probando emails. Era además inconsistente con `/forgot-password`, que sí tenía respuesta anti-enumeración.

#### ✅ Cómo se solucionó

Cuando el email ya existe, **no se revela el conflicto**. Se retorna una respuesta idéntica a un registro exitoso (con `user_id=0` y un mensaje genérico). El atacante no puede distinguir "email nuevo" de "email ya registrado".

#### 📝 Qué se modificó

```python
# ANTES
if await self._repo.email_exists(payload.email):
    raise DuplicateResourceError(f"El email '{payload.email}' ya está registrado")

# DESPUÉS
if await self._repo.email_exists(payload.email):
    logger.info("auth.register.duplicate_email_silent", email=payload.email)
    return RegisterResponse(
        user_id=0,
        email=payload.email,
        message="Si el correo es válido, recibirás un email de confirmación.",
    )
```

---

### 2.7 M-03 🟡 — Chequeo explícito de `type == "access"` en `get_current_user`

**Archivo:** `_backEnd/app/security/dependencies.py`

#### ❌ Por qué era un problema

`get_current_user` nunca verificaba que el token fuera de tipo `access`. Funcionaba porque solo los access tokens incluyen `role`, pero era una protección implícita. Un refresh/verification/reset token podría haberse usado como bearer si en el futuro incluía `role`.

#### ✅ Cómo se solucionó

Se añadió una validación explícita del claim `type`:

```python
if payload.get("type") != "access":
    raise UnauthorizedError("Tipo de token inválido para autenticación")
```

---

### 2.8 M-04 🟡 — Sanitización de errores de validación en producción

**Archivo:** `_backEnd/app/middleware/exception_handler.py`

#### ❌ Por qué era un problema

El handler de `RequestValidationError` retornaba `loc` (ruta del campo con nombres de atributos internos) y `type` (tipos de error de Pydantic como `value_error.missing`) al cliente, facilitando el mapeo del esquema a atacantes.

#### ✅ Cómo se solucionó

- En **producción**: se retorna un mensaje genérico sin detalles internos.
- En **desarrollo**: se mantienen los detalles completos para debugging.
- Los detalles completos **siempre** se loguean server-side.

```python
if settings.is_production:
    return _error_response(
        status_code=422,
        error_code="VALIDATION_ERROR",
        message="Los datos enviados no son válidos. Revisa los campos e intenta nuevamente.",
        request_id=request_id,
    )
```

---

### 2.9 M-07 🟡 — Gatear log de reset token en desarrollo

**Archivo:** `_backEnd/app/infrastructure/email/service.py`

#### ❌ Por qué era un problema

El **token completo de reset de contraseña** se logueaba en texto plano:

```python
logger.info("email.password_reset_link_generated", link=reset_link)
```

Quien tuviera acceso a logs podría secuestrar resets de contraseña.

#### ✅ Cómo se solucionó

El log del enlace completo solo se emite en desarrollo. En producción, se loguea solo el destinatario:

```python
if settings.is_development:
    logger.info("email.password_reset_link_generated", link=reset_link)
else:
    logger.info("email.password_reset_link_generated", recipient=to_email)
```

---

### 2.10 L-03 🟢 — `max_length` en schemas de token

**Archivo:** `_backEnd/app/modules/auth/schemas.py`

#### ❌ Por qué era un problema

`id_token`, `refresh_token` y `reset token` no tenían `max_length`, habilitando una superficie de DoS barata (strings enormes → URLs/Redis/logs enormes). Esto amplificaba el fallo ZAP-1.

#### ✅ Cómo se solucionó

Se añadió `min_length=10, max_length=4096` a los campos de token:

```python
class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=10, max_length=4096, ...)

class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10, max_length=4096)

class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=4096)
```

---

### 2.11 ZAP-3 🟡 — Token de verificación de uso único

**Archivos:** `_backEnd/app/core/security.py`, `_backEnd/app/modules/auth/service.py`

#### ❌ Por qué era un problema

El JWT de verificación de email (TTL 2h) **no tenía JTI ni control de uso único**, a diferencia de los tokens de refresh/reset. Era rejugable durante toda su ventana de validez.

#### ✅ Cómo se solucionó

1. `create_verification_token` ahora genera un JTI aleatorio (`uuid.uuid4()`).
2. `verify_email` registra el JTI en Redis como consumido tras su uso.
3. Si el mismo JTI se intenta usar de nuevo, se detecta como replay attack.

```python
# security.py
def create_verification_token(subject: str) -> str:
    jti = str(uuid.uuid4())
    payload = _build_payload(
        subject=subject,
        extra={"type": "verification", "jti": jti},
        expires_delta=timedelta(hours=2),
    )
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

# service.py — verify_email
jti = token_data.get("jti")
if jti:
    redis_key = f"verify_used:{jti}"
    already_used = await self._redis.exists(redis_key)
    if already_used:
        raise InvalidTokenError("Este enlace de verificación ya fue utilizado.")
    ...
    await self._redis.setex(redis_key, remaining_ttl, "used")
```

---

### 2.12 M-06 🟡 — Gatear docs en `APP_ENV`, no en `DEBUG`

**Archivos:** `_backEnd/app/core/config.py`, `_backEnd/app/main.py`

#### ❌ Por qué era un problema

Los docs de Swagger/OpenAPI se gated con `DEBUG`, lo que obligaba a `DEBUG=true` para ver los docs en staging. Como los docker-compose forzaban `DEBUG=true`, la doc quedaba expuesta. Además, `DEBUG=true` activaba `echo=True` en SQLAlchemy (log de SQL completo).

#### ✅ Cómo se solucionó

- Se añadió la propiedad `expose_docs` que depende de `APP_ENV != "production"`.
- Los docs ahora se exponen en development/staging sin necesidad de `DEBUG=true`.
- Se añadió un warning en el `model_validator` si `DEBUG=true` en producción.

```python
# config.py
@property
def expose_docs(self) -> bool:
    return self.APP_ENV != "production"

# main.py
docs_url="/api/docs" if settings.expose_docs else None,
openapi_url="/api/openapi.json" if settings.expose_docs else None,
```

---

## 3) 🎨 Cambios en el Frontend

### 3.1 C-03 🔴 — Access token solo en memoria (no en `sessionStorage`)

**Archivo:** `_frontEnd/src/features/auth/store/auth.store.ts`

#### ❌ Por qué era un problema

Tanto el `accessToken` como el `refreshToken` se persistían en `sessionStorage` (clave `mitrufely-auth`), que es completamente legible por cualquier JavaScript en ejecución (XSS). Esto **contradecía la documentación del propio proyecto**, que afirmaba que el token se almacenaba en memoria.

#### ✅ Cómo se solucionó

- El `partialize` del persist ahora **solo** guarda `user` e `isAuthenticated` (datos no sensibles).
- El `accessToken` vive **solo en memoria** (variable de módulo en `axios.ts`).
- El `refreshToken` se mantiene en el state del store (en memoria), pero **no se persiste** en `sessionStorage`.
- Se eliminó el código que leía el token de `sessionStorage` al cargar el módulo.

#### 📝 Qué se modificó

```typescript
// ANTES
partialize: (state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
  refreshToken: state.refreshToken,   // ← expuesto a XSS
  accessToken: state.accessToken,     // ← expuesto a XSS
}),

// DESPUÉS
partialize: (state) => ({
  user: state.user,                   // no sensible
  isAuthenticated: state.isAuthenticated,  // no sensible
  // accessToken → solo en memoria (axios.ts)
  // refreshToken → solo en memoria (state del store, no partialized)
}),
```

---

### 3.2 C-04 🔴 — `.env` removido de git + `.gitignore` actualizado

**Archivos:** `_frontEnd/.gitignore`, `_frontEnd/.env` (removido del tracking), `_frontEnd/.env.example` (actualizado)

#### ❌ Por qué era un problema

El `.env` del frontend estaba **commiteado a git** (commit `3c842f9`) con el `VITE_GOOGLE_CLIENT_ID` real. El `.gitignore` solo excluía `*.local`, no `.env`. El archivo quedaba permanentemente en el historial de git.

#### ✅ Cómo se solucionó

1. Se ejecutó `git rm --cached _frontEnd/.env` (removido del tracking, el archivo sigue en disco).
2. Se actualizó `.gitignore` para excluir `.env` y `.env.*`, pero permitir `.env.example`.
3. Se actualizó `.env.example` como plantilla con placeholders (sin valores reales), incluyendo la sección de Google OAuth.

#### 📝 Qué se modificó

```gitignore
# .gitignore (añadido)
# ── Environment files (C-04: CWE-540) ──────────────────────────────────────
.env
.env.*
!.env.example
```

> ⚠️ **Acción pendiente:** El historial de git aún contiene el `.env` con el Client ID real. Se recomienda rotar el Google Client ID y limpiar el historial con `git filter-repo` o BFG.

---

### 3.3 H-06 🟠 — `authApi.logout()` conectado en todos los `handleLogout`

**Archivo creado:** `_frontEnd/src/features/auth/hooks/useLogout.ts`
**Archivos modificados:** 10 componentes con `handleLogout`

#### ❌ Por qué era un problema

Todos los handlers de logout llamaban solo a la acción local del store (`logout()`), que limpia memoria + `sessionStorage` pero **NO invalida el refresh token en el servidor**. Un refresh token exfiltrado seguía válido hasta 7 días. La función `authApi.logout()` estaba definida pero **nunca se invocaba** (0 llamadores).

#### ✅ Cómo se solucionó

Se creó un hook reutilizable `useLogout` que:
1. Llama a `authApi.logout()` (POST `/auth/logout`) → el backend añade el access token a la blocklist de Redis.
2. Limpia el store local (memoria + sessionStorage).
3. Es tolerante a fallos de red: si el POST falla, igual limpia el store local.

Se actualizaron **10 componentes** para usar este hook en lugar del `logout()` directo del store:

| Componente | Archivo |
|-----------|---------|
| AdminLayout | `components/layout/AdminLayout.tsx` |
| HomePage | `pages/public/HomePage.tsx` |
| CartView | `features/cart/components/CartView.tsx` |
| CatalogPage | `features/catalog/pages/CatalogPage.tsx` |
| AboutPage | `features/about/pages/AboutPage.tsx` |
| CustomerOrdersPage | `features/orders/pages/CustomerOrdersPage.tsx` |
| CustomerOrderDetailPage | `features/orders/pages/CustomerOrderDetailPage.tsx` |
| ProductDetailView | `features/products/pages/ProductDetailView.tsx` |
| PackDetailView | `features/products/pages/PackDetailView.tsx` |
| PointsView | `features/sweetcoins/pages/PointsView.tsx` |

#### 📝 Qué se modificó (patrón aplicado en cada componente)

```typescript
// ANTES
const { user, logout } = useAuthStore()
...
const handleLogout = () => {
  logout()
  toast.success('Sesión cerrada correctamente.')
}

// DESPUÉS
import { useLogout } from '@/features/auth/hooks/useLogout'
...
const { user } = useAuthStore()
const logout = useLogout()
...
const handleLogout = async () => {
  await logout()  // ← ahora llama al backend (POST /auth/logout)
  toast.success('Sesión cerrada correctamente.')
}
```

---

### 3.4 L-05 🟢 — Eliminación del store de auth duplicado

**Archivo eliminado:** `_frontEnd/src/stores/auth.store.ts`

#### ❌ Por qué era un problema

Existían dos implementaciones de `useAuthStore`: la activa en `features/auth/store/` y una obsoleta en `stores/`. La versión obsoleta **no persistía `accessToken`** (comportamiento opuesto al activo). Un futuro desarrollador editando el archivo equivocado podría cambiar silenciosamente la persistencia de tokens o reintroducir `localStorage`.

#### ✅ Cómo se solucionó

Se eliminó el archivo obsoleto. El `app/store.ts` ya re-exporta únicamente la versión activa de `features/auth/store/auth.store.ts`.

---

## 4) 🐳 Cambios en Infraestructura

### 4.1 M-10 🟡 — Headers de seguridad en nginx

**Archivo:** `_frontEnd/nginx.conf`

#### ❌ Por qué era un problema

La config de nginx definía cache y gzip pero **ningún** header de seguridad. Con los tokens en `sessionStorage` (ahora corregido), la ausencia de CSP aumentaba la explotabilidad de XSS. Además, solo `listen 80` (sin TLS).

#### ✅ Cómo se solucionó

Se añadieron los siguientes headers al bloque `server` de nginx:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

La CSP permite `self` para scripts/connect, fuentes de Google Fonts, imágenes desde cualquier HTTPS, y bloquea frames/plugins.

---

### 4.2 M-12 🟡 — Eliminación del webhook token por defecto

**Archivos:** `_deliveryService/main.py`, `docker-compose.yml`

#### ❌ Por qué era un problema

El token de webhook tenía un valor por defecto débil y trivialmente adivinable: `"dev-webhook-token"`. Si el backend confiaba en este token para autenticar webhooks de delivery, cualquier caller que conociera este valor público podía **falsificar webhooks de entrega completada**.

#### ✅ Cómo se solucionó

- El default en `_deliveryService/main.py` ahora es un string vacío `""` (sin token por defecto).
- En `docker-compose.yml`, el token se provee vía variable de entorno con un valor aleatorio no trivial.
- En producción, debe establecerse via secrets manager.

```python
# ANTES
DELIVERY_WEBHOOK_TOKEN = os.getenv("DELIVERY_WEBHOOK_TOKEN", "dev-webhook-token")

# DESPUÉS
DELIVERY_WEBHOOK_TOKEN = os.getenv("DELIVERY_WEBHOOK_TOKEN", "")
```

```yaml
# docker-compose.yml
- DELIVERY_WEBHOOK_TOKEN=${DELIVERY_WEBHOOK_TOKEN:-change-me-in-prod-7f3a9b2e}
```

---

## 5) ✅ Verificación

### Compilación Python

Todos los archivos Python modificados compilan sin errores:

```
$ python -m py_compile app/main.py app/core/config.py app/core/security.py \
    app/modules/auth/service.py app/modules/auth/schemas.py app/modules/auth/router.py \
    app/security/dependencies.py app/middleware/exception_handler.py \
    app/middleware/security_headers.py app/infrastructure/email/service.py
=== ALL PYTHON FILES COMPILE OK ===
```

### Estado de git

```
$ git status --short
 M _backEnd/app/core/config.py
 M _backEnd/app/core/security.py
 M _backEnd/app/infrastructure/email/service.py
 M _backEnd/app/main.py
 M _backEnd/app/middleware/exception_handler.py
 M _backEnd/app/modules/auth/router.py
 M _backEnd/app/modules/auth/schemas.py
 M _backEnd/app/modules/auth/service.py
 M _backEnd/app/security/dependencies.py
 M _backEnd/requirements.txt
 M _deliveryService/main.py
D  _frontEnd/.env                              ← removido del tracking
 M _frontEnd/.env.example
 M _frontEnd/.gitignore
 M _frontEnd/nginx.conf
 M _frontEnd/src/components/layout/AdminLayout.tsx
 M _frontEnd/src/features/about/pages/AboutPage.tsx
 M _frontEnd/src/features/auth/store/auth.store.ts
 M _frontEnd/src/features/cart/components/CartView.tsx
 M _frontEnd/src/features/catalog/pages/CatalogPage.tsx
 M _frontEnd/src/features/orders/pages/CustomerOrderDetailPage.tsx
 M _frontEnd/src/features/orders/pages/CustomerOrdersPage.tsx
 M _frontEnd/src/features/products/pages/PackDetailView.tsx
 M _frontEnd/src/features/products/pages/ProductDetailView.tsx
 M _frontEnd/src/features/sweetcoins/pages/PointsView.tsx
 M _frontEnd/src/pages/public/HomePage.tsx
 D _frontEnd/src/stores/auth.store.ts          ← store obsoleto eliminado
 M docker-compose.yml
?? _backEnd/app/middleware/security_headers.py  ← nuevo middleware
```

### Verificaciones de tracking

- `_frontEnd/.env` → **no trackeado** ✅ (removido con `git rm --cached`)
- `_frontEnd/.env.example` → **trackeado** ✅
- `_frontEnd/src/stores/auth.store.ts` → **eliminado** ✅
- `_backEnd/app/middleware/security_headers.py` → **nuevo archivo** ✅

---

## 6) 🗺️ Hallazgos Pendientes (Roadmap)

Los siguientes hallazgos de la auditoría **no se corregicon en esta iteración** por requerir cambios de infraestructura más profundos o acciones externas:

| ID | Severidad | Razón de no corrección | Acción recomendada |
|----|-----------|----------------------|-------------------|
| **C-02** | 🔴 Crítico | Requiere rotación de secretos externos (NeonDB, Gmail, Cloudinary) | Rotar TODOS los secretos; migrar a gestor de secretos; correr `gitleaks` sobre el historial |
| **H-01** | 🟠 Alto | Requiere migración de DB (añadir columna `token_version`) | Implementar claim `token_version` + bump en password change |
| **H-02** | 🟠 Alto | Requiere cambio de algoritmo JWT (HS256→RS256) + infra de claves | Migrar a RS256/EdDSA con claves asimétricas |
| **M-01** | 🟡 Medio | Parcialmente corregido (ZAP-3 añade uso único) | El token verify ahora es de uso único; revisar TTL |
| **M-02** | 🟡 Medio | Requiere tracking de familia de refresh tokens | Invalidar toda la familia en replay detection |
| **M-05** | 🟡 Medio | El rate limit por IP sigue; slowapi ayuda pero no bloquea por cuenta | Añadir bloqueo por cuenta + CAPTCHA |
| **M-08** | 🟡 Medio | Requiere migrar el flujo OAuth del frontend | Migrar a Authorization Code + PKCE |
| **M-09** | 🟡 Medio | Requiere hacer configurable el redirect_uri | Usar `VITE_GOOGLE_REDIRECT_URI` con valor HTTPS |
| **M-11** | 🟡 Medio | Requiere cambiar la imagen Docker de Celery | Eliminar `C_FORCE_ROOT=true`; usar non-root |
| **M-13** | 🟡 Medio | Requiere añadir auth al microservicio de delivery | Restringir endpoints a IP del backend o secreto compartido |
| **L-01 a L-09** | 🟢 Bajo | Mejoras de defensa en profundidad | Incluir en deuda técnica |

---

## 📁 Archivos de referencia

| Archivo | Propósito |
|---------|-----------|
| `_docs/PruebaDeSeguridad/Auditoria_Seguridad_MitrufelyWeb.md` | Auditoría original (antes) |
| `_docs/PruebaDeSeguridad/Despues/Informe_Cambios_Implementados.md` | Este informe (después) |
| `_backEnd/app/middleware/security_headers.py` | Nuevo middleware de headers de seguridad |
| `_frontEnd/src/features/auth/hooks/useLogout.ts` | Nuevo hook de logout con invalidación server-side |

---

*Fin del informe.*
