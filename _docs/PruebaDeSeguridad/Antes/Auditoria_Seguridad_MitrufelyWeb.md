# 🔐 Auditoría de Seguridad — MitrufelyWeb

> **Proyecto:** MitrufelyWeb (API FastAPI + Frontend React/Vite + Microservicio de Delivery)
> **Fecha de la auditoría:** 12 de julio de 2026
> **Alcance:** Validación de hallazgos del escaneo OWASP ZAP (reporte del 11-jul-2026) + búsqueda activa de brechas de seguridad adicionales en backend, frontend e infraestructura.
> **Escaneo ZAP de referencia:** `2026-07-11-ZAP-Report-.html` — sitio escaneado `http://localhost:8000`, 131 endpoints, 4 alertas.

---

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#1--resumen-ejecutivo)
2. [Metodología](#2--metodología)
3. [Validación de Hallazgos del Reporte ZAP](#3--validación-de-hallazgos-del-reporte-zap)
4. [Hallazgos Adicionales — Backend](#4--hallazgos-adicionales--backend)
5. [Hallazgos Adicionales — Frontend](#5--hallazgos-adicionales--frontend)
6. [Hallazgos Adicionales — Infraestructura / Docker](#6--hallazgos-adicionales--infraestructura--docker)
7. [Hallazgos Adicionales — Microservicio de Delivery](#7--hallazgos-adicionales--microservicio-de-delivery)
8. [Aspectos Positivos Detectados](#8--aspectos-positivos-detectados)
9. [Plan de Remediación Priorizado](#9--plan-de-remediación-priorizado)
10. [Matriz de Hallazgos](#10--matriz-de-hallazgos)
11. [Anexo — Cobertura del Escaneo ZAP](#11--anexo--cobertura-del-escaneo-zap)

---

## 1) 📊 Resumen Ejecutivo

Se realizó una auditoría de seguridad del producto MitrufelyWeb que combina dos actividades:

1. **Validación de los 4 hallazgos del reporte OWASP ZAP** contra el código fuente real.
2. **Búsqueda activa de brechas de seguridad adicionales** mediante revisión manual del código (backend FastAPI, frontend React/Vite, microservicio de delivery y configuración Docker).

### Resultado global

| Severidad | Hallazgos ZAP (validados) | Hallazgos adicionales | Total |
|-----------|:------------------------:|:--------------------:|:----:|
| 🔴 Crítico | 0 | 4 | **4** |
| 🟠 Alto | 0 | 5 | **5** |
| 🟡 Medio | 1 | 9 | **10** |
| 🟢 Bajo | 1 | 8 | **9** |
| 🔵 Informativo | 2 | 5 | **7** |
| **Total** | **4** | **31** | **35** |

### Conclusión principal

El reporte ZAP detectó **solo 4 alertas** (ninguna alta/crítica), lo cual podría dar una falsa sensación de seguridad. La revisión manual del código reveló **31 brechas adicionales**, de las cuales **4 son críticas y 5 son altas**. Las más graves son:

- **Escalada de privilegios a administrador por dominio de email sin verificación** (C-01).
- **Secretos de producción vivos en disco** (NeonDB, Gmail, Cloudinary) en `_backEnd/.env` (C-02).
- **Tokens JWT (access + refresh) persistidos en `sessionStorage`**, exponiéndolos a robo por XSS — contradiciendo la documentación del propio proyecto (C-03).
- **`.env` del frontend commiteado a git** con el Google Client ID (C-04).

> ⚠️ **El escaneo ZAP automatizado es necesario pero NO suficiente.** Cubre vulnerabilidades de superficie HTTP pero no detecta fallos de lógica de negocio, gestión de secretos, almacenamiento de tokens en el cliente, ni errores de diseño de autenticación. La revisión manual de código es complementaria y obligatoria.

---

## 2) 🔍 Metodología

### Fuentes de información

- **Reporte ZAP:** `ZAP por Informe de Escaneo Checkmarx.html` (generado el 11-jul-2026 con ZAP 2.17.0).
- **Código fuente:** repositorio local `MitrufelyWeb` (rama `master`, commit `1e20d88`).

### Áreas auditadas

| Componente | Ruta | Tecnologías |
|-----------|------|-------------|
| Backend | `_backEnd/` | FastAPI, SQLAlchemy (async), Redis, Celery, Pydantic v2 |
| Frontend | `_frontEnd/` | React 19, Vite 8, TypeScript, Zustand, Axios, React Query |
| Microservicio Delivery | `_deliveryService/` | FastAPI |
| Infraestructura | `docker-compose.yml`, `Dockerfile` | Docker, nginx |

### Clasificación de severidad

| Nivel | Criterio |
|-------|---------|
| 🔴 Crítico | Compromiso total del sistema, acceso a datos sensibles, o ejecución remota de código explotable sin autenticación. |
| 🟠 Alto | Compromiso significativo de seguridad, requiere condiciones específicas pero de alto impacto. |
| 🟡 Medio | Vulnerabilidad real con impacto limitado o que requiere prerequisitos. |
| 🟢 Bajo | Debilidad de defensa en profundidad o impacto marginal. |
| 🔵 Informativo | Observación de buenas prácticas o riesgo teórico sin impacto directo. |

---

## 3) ✅ Validación de Hallazgos del Reporte ZAP

El reporte ZAP arrojó **4 alertas** sobre el sitio `http://localhost:8000`. A continuación se valida cada una contra el código fuente.

### 3.1 🟡 Format String Error (CWE-134) — `POST /api/v1/auth/google`

| Atributo | Valor |
|----------|-------|
| **Severidad ZAP** | Medio |
| **Confianza ZAP** | Media |
| **CWE** | CWE-134 |
| **OWASP** | 2025-A05 (Injection), 2021-A03, 2017-A01, API 2023-API10, 2025-A10 |
| **Estado de validación** | ✅ **Confirmado como fallo real** (pero clasificación de ZAP es inexacta) |

#### Evidencia del ataque ZAP

```
POST http://localhost:8000/api/v1/auth/google
{"id_token":"ZAP%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s%n%s"}
```

Respuesta: `HTTP/1.1 500 Internal Server Error` → `{"success":false,"error":{"code":"INTERNAL_ERROR","message":"Error interno del servidor"}}`

#### Análisis del código — `_backEnd/app/modules/auth/service.py:61-69`

```python
async def _verify_google_token(id_token: str, client_id: str) -> dict:
    import httpx
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"   # ← línea 63
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
    except httpx.RequestError as exc:                                      # ← línea 67
        logger.error("auth.google.network_error", error=str(exc))
        raise ExternalServiceError("No se pudo contactar con los servidores de Google") from exc
```

#### Causa raíz real

1. El `id_token` se interpola **sin codificación ni validación** en la URL mediante f-string (línea 63).
2. El esquema Pydantic no impone restricciones — `_backEnd/app/modules/auth/schemas.py:69-75`:
   ```python
   class GoogleLoginRequest(BaseModel):
       id_token: str = Field(..., description="ID Token JWT devuelto por Google...")
   ```
   No hay `max_length`, `pattern` ni `min_length`.
3. Al enviar `ZAP%n%s%n%s...`, las secuencias `%n`/`%s` son **codificaciones percent inválidas**. `httpx` lanza `httpx.InvalidURL`.
4. El bloque `except` (línea 67) **solo captura `httpx.RequestError`**, pero `httpx.InvalidURL` hereda de `httpx.HTTPError` (no de `RequestError`), por lo que **la excepción escapa sin capturar** → 500.

#### 🔎 Corrección de la clasificación de ZAP

ZAP etiqueta esto como **CWE-134 (Format String Error)**, pero **no es un format string verdadero**. En Python no existe la corrupción de memoria por `%n`/`%s` como en C. La clase real del fallo es:

- **CWE-20 (Improper Input Validation)** — falta validación del `id_token`.
- **CWE-75 (Failure to Sanitize Special Elements into a Different Plane)** — el `%` rompe el parser de URL.
- **CWE-1286 (Improper Validation of Syntactic Correctness of Input)** — el input no cumple la sintaxis de un JWT.

No obstante, **el fallo es real y explotable**: cualquier input malformado produce un 500, lo que confirma el hallazgo de ZAP (aunque con clasificación imprecisa).

#### ¿Filtra información al cliente?

**No.** El handler genérico en `_backEnd/app/middleware/exception_handler.py:89-106` retorna solo `"Error interno del servidor"`. El stack trace se registra en logs del servidor (`logger.exception`). Esto es una buena práctica.

#### Remediación

```python
# schemas.py — restringir el token a la sintaxis base64url de un JWT
class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., min_length=10, max_length=4096,
                          pattern=r"^[A-Za-z0-9_\-\.]+$")

# service.py — pasar como params (httpx codifica automáticamente) y ampliar el except
url = "https://oauth2.googleapis.com/tokeninfo"
async with httpx.AsyncClient(timeout=10.0) as client:
    response = await client.get(url, params={"id_token": id_token})
# ...
except (httpx.RequestError, httpx.HTTPError) as exc:
    raise ExternalServiceError("No se pudo contactar con los servidores de Google") from exc
```

> Idealmente, reemplazar el endpoint `tokeninfo` (de depuración) por el verificador oficial: `google.oauth2.id_token.verify_oauth2_token`.

---

### 3.2 🟢 Falta encabezado X-Content-Type-Options (CWE-693) — `GET /api/openapi.json`

| Atributo | Valor |
|----------|-------|
| **Severidad ZAP** | Bajo |
| **Confianza ZAP** | Media |
| **CWE** | CWE-693 (Protection Mechanism Failure) |
| **OWASP** | 2025-A02 (Security Misconfiguration), 2021-A05, 2017-A06 |
| **Estado de validación** | ✅ **Confirmado — Systemic (afecta a TODA la API)** |

#### Hallazgo

ZAP detectó que la respuesta a `GET /api/openapi.json` no incluye el encabezado `X-Content-Type-Options: nosniff`. La etiqueta `SYSTEMIC` indica que el problema se repite en múltiples respuestas.

#### Análisis del código — `_backEnd/app/main.py:55-64`

```python
# ── Middleware Stack (order matters: outermost executes first) ─────────────
application.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=settings.ALLOWED_METHODS,
    allow_headers=settings.ALLOWED_HEADERS,
)
application.add_middleware(GZipMiddleware, minimum_size=1000)
application.add_middleware(RequestIDMiddleware)
```

**El stack de middleware solo contiene CORS, GZip y RequestID. No existe ningún middleware que agregue cabeceras de seguridad.** Confirmado además en `_backEnd/app/middleware/__init__.py`, que solo exporta un docstring.

#### Faltan TODOS estos encabezados en cada respuesta

| Encabezado | Función |
|-----------|---------|
| `X-Content-Type-Options: nosniff` | Previene MIME-sniffing (la alerta de ZAP) |
| `X-Frame-Options: DENY` | Previene clickjacking |
| `Strict-Transport-Security` | Fuerza HTTPS |
| `Content-Security-Policy` | Previene XSS / inyección de contenido |
| `Referrer-Policy` | Controla filtrado de URLs vía Referer |
| `Permissions-Policy` | Restringe APIs del navegador |

#### Remediación

Crear un middleware `SecurityHeadersMiddleware` y registrarlo en `main.py`:

```python
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response
```

---

### 3.3 🔵 Divulgación de Información — Información sensible en URL (CWE-598)

| Atributo | Valor |
|----------|-------|
| **Severidad ZAP** | Informativo |
| **Confianza ZAP** | Media |
| **CWE** | CWE-598 (Use of GET Request Method With Sensitive Query Strings) |
| **OWASP** | 2025-A01 (Broken Access Control), 2021-A01, 2017-A03 |
| **Estado de validación** | ✅ **Confirmado** |

#### Evidencia

```
GET http://localhost:8000/api/v1/auth/verify?token=token
```

ZAP detectó el patrón `token` en la URL, marcándolo como información sensible.

#### Análisis del código — `_backEnd/app/modules/auth/router.py:128-139`

```python
@router.get("/verify", status_code=status.HTTP_200_OK, summary="Verificar cuenta de usuario")
async def verify_account(
    token: str,                    # ← parámetro de función en GET → query string
    service: AuthServiceDep,
) -> dict[str, str]:
    await service.verify_email(token)
    return {"message": "Cuenta verificada exitosamente. Ya puedes iniciar sesión."}
```

Al declarar `token: str` en un endpoint `GET` sin `Body(...)`, FastAPI lo trata como **parámetro de query string**. El token es un JWT de verificación (TTL 2 horas, ver `security.py:73-79`) que activa la cuenta.

#### Impacto

El token queda registrado en:
- Logs de acceso de proxies/WAF/load balancers.
- Historial del navegador.
- Cabecera `Referer` (si la página de aterrizaje carga recursos de terceros).

Además, el token **no tiene JTI ni control de uso único** (a diferencia de los tokens de reset/refresh que sí lo tienen), por lo que es **rejugable durante toda su ventana de validez de 2 horas**.

#### Remediación

- Convertir el token de verificación en una cadena opaca aleatoria de un solo uso (almacenada en Redis con TTL corto), no un JWT.
- O mantener el GET (para clic en email) pero que la página de aterrizaje haga un `POST` inmediato para intercambiar/rotar el token.

> 📌 **Nota:** Este patrón (token en URL de email) es común y aceptable, pero el riesgo se mitiga con uso único + TTL corto. El fallo real es la ausencia de uso único.

---

### 3.4 🔵 Petición de Autenticación Identificada

| Atributo | Valor |
|----------|-------|
| **Severidad ZAP** | Informativo |
| **Confianza ZAP** | Alta |
| **Estado de validación** | ✅ **Confirmado — No es vulnerabilidad** |

#### Evidencia

```
POST http://localhost:8000/api/v1/auth/login
{"email":"zaproxy@example.com","password":"ZAP"}
```

Respuesta: `HTTP/1.1 422 Unprocessable Entity` con detalle `"String should have at least 8 characters"`.

#### Análisis

ZAP simplemente identificó que `/auth/login` es un endpoint de autenticación (campos `email` + `password`). Es una alerta **puramente informativa**, no una vulnerabilidad. ZAP lo reporta para que el operador sepa qué endpoint usar al configurar autenticación automatizada.

#### Observación derivada

La respuesta 422 revela la política mínima de contraseña (8 caracteres). Esto es un detalle menor de divulgación de información — un atacante aprende la longitud mínima sin siquiera probar credenciales. **Severidad: Informativo.**

---

## 4) 🆕 Hallazgos Adicionales — Backend

Brechas detectadas mediante revisión manual del código que **ZAP no reportó**.

### C-01 🔴 — Escalada de privilegios a ADMIN por dominio de email sin verificación

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔴 Crítico |
| **Ubicación** | `_backEnd/app/modules/auth/service.py:168-192`, `_backEnd/app/core/config.py:36` |
| **CWE** | CWE-269 (Improper Privilege Management), CWE-285 (Improper Authorization) |
| **OWASP** | 2025-A01 (Broken Access Control), 2021-A01 |

#### Código vulnerable — `service.py:168-192`

```python
# Determinar rol dinámicamente según dominio
is_admin = payload.email.lower().endswith(f"@{settings.ADMIN_EMAIL_DOMAIN.lower()}")
target_role = TipoRolEnum.ADMIN if is_admin else TipoRolEnum.CLIENTE
...
new_user = Usuario(
    id_rol=rol_db.id_rol,
    ...
    estado=True if is_admin else False,   # ← admins saltan la verificación de email!
    auth_provider=AuthProviderEnum.LOCAL.value,
)
```

Configuración — `config.py:36`:
```python
ADMIN_EMAIL_DOMAIN: str = "mitrufely.com"
```

#### Explotación

1. Un atacante se registra con cualquier email `*@mitrufely.com` (si controla un buzón, o si el dominio está mal configurado a un proveedor público).
2. `EmailStr` de Pydantic solo valida el **formato**, no la **propiedad** del buzón.
3. La cuenta se crea con `id_rol = ADMIN` y `estado = True` → **login inmediato, sin verificación de email**.
4. Resultado: **acceso administrativo total** sin verificación de identidad.

Adicionalmente, el endpoint `/register` revela si un email ya existe (ver C-05), permitiendo enumerar cuentas admin.

#### Remediación

- **Nunca** auto-promocionar a admin desde un endpoint de auto-registro.
- Provisionar admins vía script de seed / token de invitación out-of-band.
- Si se conserva la lógica de dominio, exigir verificación de email **antes** de asignar el rol admin (no `estado=True`).

---

### C-02 🔴 — Secretos de producción vivos en disco (`_backEnd/.env`)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔴 Crítico |
| **Ubicación** | `_backEnd/.env` (presente en disco) |
| **CWE** | CWE-798 (Use of Hard-coded Credentials), CWE-540 |

#### Secretos expuestos

| Secret | Línea | Valor (parcial) |
|--------|-------|-----------------|
| DATABASE_URL (NeonDB) | 22 | `postgresql+asyncpg://neondb_owner:npg_MmqrCbyd1pI6@...neon.tech/neondb` |
| SMTP_PASSWORD (Gmail) | 68 | `vcupsbucxenxkikt` (app password de `abeltrufas@gmail.com`) |
| CLOUDINARY_API_SECRET | 79 | `mTN8eDQeK5FSueSYZTIBQrySPcY` |
| GOOGLE_CLIENT_ID | 74 | `264198079598-tt28nvaod4f740q778ivtvueubgi0iel...` |
| SECRET_KEY (JWT dev) | 30 | `super-secret-key-for-local-testing-only-32chars` |

#### Estado en git

✅ `.env` **NO está trackeado** en git (confirmado: `_backEnd/.gitignore` lo excluye). Sin embargo, el archivo existe en disco con secretos reales de producción. Cualquiera con acceso de lectura al filesystem (o a un backup) obtiene control total de la base de datos, correo, almacenamiento y OAuth.

> ⚠️ Aunque no está en git, **debe verificarse el historial** con `gitleaks` para confirmar que nunca se commiteó en commits antiguos.

#### Remediación

1. **Rotar TODOS los secretos inmediatamente**: password de NeonDB, app password de Gmail, API secret de Cloudinary, client secret de Google.
2. Mover los secretos a un gestor de secretos (AWS Secrets Manager, Doppler, Vault).
3. Ejecutar `gitleaks detect` sobre el historial completo de git.

---

### H-01 🟠 — Reset de contraseña no invalida sesiones existentes

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟠 Alto |
| **Ubicación** | `_backEnd/app/modules/auth/service.py:602-607` |
| **CWE** | CWE-613 (Insufficient Session Expiration) |

#### Código

```python
user = await self._repo.get_by_id(int(token_data["sub"]))
if not user:
    raise NotFoundError("Usuario no encontrado")
user.password_hash = hash_password(payload.new_password)
await self._repo.update(user)
```

Tras un reset de contraseña, **los access tokens (hasta 60 min) y refresh tokens (hasta 30 días) existentes siguen siendo válidos**. Si el reset fue provocado por un compromiso de cuenta, las sesiones del atacante **no se cierran**.

#### Remediación

Implementar un claim `token_version` por usuario y bumpearlo al cambiar la contraseña (y al cambiar el rol). Verificar la versión en cada request autenticado.

---

### H-02 🟠 — Role confiado directamente del claim JWT (sin chequeo DB por request)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟠 Alto (defensa en profundidad) |
| **Ubicación** | `_backEnd/app/modules/auth/dependencies.py:63-78` |
| **CWE** | CWE-565 |

`get_current_user` lee `role` del JWT sin validar contra la base de datos. Combinado con HS256 (clave compartida), quien tenga el `SECRET_KEY` puede forjar cualquier rol. Un admin degradado mantiene sus privilegios hasta que expira su access token (≤60 min).

#### Remediación

- Para operaciones críticas, verificar el rol en la DB en cada request.
- Considerar RS256/EdDSA con claves asimétricas para que el servicio que emite tokens no pueda validar tokens arbitrarios con la misma clave.

---

### H-03 🟠 — Sin rate limiting global

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟠 Alto |
| **Ubicación** | `_backEnd/app/main.py` (ausencia); solo hay contadores manuales en `_backEnd/app/modules/auth/router.py:51-72` |
| **CWE** | CWE-770 (Allocation of Resources Without Limits) |

No existe ningún middleware ni librería de rate limiting (búsqueda de `slowapi|fastapi-limiter|RateLimit` = 0 resultados). Solo hay limitación manual **por IP** en `/login` (5 intentos / 60s) y `/forgot-password` (3 / hora). **Todos los demás endpoints** (registro, carrito, pedidos, productos, reportes, uploads Cloudinary) quedan **desprotegidos** frente a brute-force, credential stuffing, scraping y DoS.

#### Remediación

Instalar `slowapi` o `fastapi-limiter` y aplicar límites globales + por ruta.

---

### H-04 🟠 — CORS: `allow_credentials=True` + `ALLOWED_HEADERS=["*"]`

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟠 Alto |
| **Ubicación** | `_backEnd/app/main.py:59-61`, `_backEnd/app/core/config.py:60` |
| **CWE** | CWE-942 |

```python
# main.py
allow_credentials=True,
allow_headers=settings.ALLOWED_HEADERS,   # ["*"]
# config.py
ALLOWED_HEADERS: list[str] = ["*"]
```

Aunque los orígenes están restringidos, la combinación `allow_credentials=True` + headers comodín es un anti-patrón de configuración CORS. No existe validación que impida configurar `ALLOWED_ORIGINS=["*"]` en producción (lo cual, con credentials, los navegadores rechazan, pero degrada silenciosamente).

#### Remediación

```python
ALLOWED_HEADERS: list[str] = ["Authorization", "Content-Type", "X-Request-ID"]
```

Añadir un `model_validator` que rechace `*` en `ALLOWED_ORIGINS` cuando `allow_credentials=True`.

---

### H-05 🟠 — Enumeración de cuentas vía `/register`

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟠 Alto |
| **Ubicación** | `_backEnd/app/modules/auth/service.py:159-160` |
| **CWE** | CWE-204 (Observable Response Discrepancy) |

```python
if await self._repo.email_exists(payload.email):
    raise DuplicateResourceError(f"El email '{payload.email}' ya está registrado")
```

El endpoint revela explícitamente si un email ya está registrado, permitiendo enumerar cuentas. Esto es **inconsistente** con `/forgot-password`, que sí tiene respuesta anti-enumeración (siempre idéntica, `service.py:528-565`).

#### Remediación

Retornar un mensaje genérico tipo *"Si el email es válido, recibirás un correo de confirmación"* y enviar el correo de verificación solo si la cuenta no existe.

---

### M-01 🟡 — Token de verificación en URL sin control de uso único

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_backEnd/app/modules/auth/security.py:73-79`, `service.py` (verify_email) |
| **CWE** | CWE-1284 |

El JWT de verificación de email (TTL 2h) **no tiene JTI ni se registra en Redis para uso único**, a diferencia de los tokens de refresh/reset que sí lo hacen. Es rejugable durante toda su ventana.

---

### M-02 🟡 — Rotación de refresh tokens no invalida la familia completa

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_backEnd/app/modules/auth/service.py:326-385` |
| **CWE** | CWE-613 |

La detección de replay (refresh token reuse) bloquea solo el JTI reusado, **no invalida los demás refresh tokens vivos de la familia**. Un refresh token robado pero aún no usado sigue válido hasta 30 días.

---

### M-03 🟡 — Falta chequeo explícito de `type == "access"` en `get_current_user`

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio (defensa en profundidad) |
| **Ubicación** | `_backEnd/app/modules/auth/dependencies.py:63-78` |
| **CWE** | CWE-347 |

`get_current_user` nunca verifica que `payload["type"] == "access"`. Hoy funciona porque solo los access tokens incluyen `role`, pero es una protección implícita. Un futuro tipo de token con `role` sería aceptado como bearer.

#### Remediación

```python
if payload.get("type") != "access":
    raise UnauthorizedError("Tipo de token inválido")
```

---

### M-04 🟡 — Errores de validación Pydantic filtran detalles internos del esquema

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_backEnd/app/middleware/exception_handler.py:61-87` |
| **CWE** | CWE-209 (Generation of Error Message Containing Sensitive Information) |

El handler de `RequestValidationError` retorna `loc` (ruta del campo con nombres de atributos internos) y `type` (tipos de error de Pydantic como `value_error.missing`). Esto facilita el mapeo del esquema a atacantes.

#### Remediación

En producción, aplanar el detalle a mensajes orientados al usuario sin exponer `loc`/`type` internos.

---

### M-05 🟡 — Rate limit de login solo por IP

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_backEnd/app/modules/auth/router.py:51-72` |
| **CWE** | CWE-307 |

El limitador de `/login` (5/60s) es **solo por IP**, trivialmente evitable rotando IPs/proxies. No hay bloqueo por cuenta ni CAPTCHA. Además, el contador incrementa también en logins exitosos, por lo que un usuario legítimo que inicia sesión 5+ veces en 60s queda bloqueado.

---

### M-06 🟡 — `DEBUG=true` forzado en docker-compose + Swagger expuesto

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_backEnd/docker-compose.yml:34`, `docker-compose.yml:33`, `.env:9` |

Los archivos compose fuerzan `DEBUG=true`, lo que:
- Expone `/api/docs`, `/api/redoc`, `/api/openapi.json` (la validación de ZAP en §3.2 se hizo sobre la doc expuesta).
- Activa `echo=True` en SQLAlchemy → log de SQL completo con parámetros.

#### Remediación

Gatear los docs en `APP_ENV != "production"` en lugar de `DEBUG`. No forzar `DEBUG=true` en compose de producción.

---

### M-07 🟡 — Reset password token registrado en logs en texto plano

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_backEnd/app/infrastructure/email/service.py:85-86` |
| **CWE** | CWE-532 (Insertion of Sensitive Information into Log File) |

```python
# Log reset link to standard out for easy local copy-paste development
logger.info("email.password_reset_link_generated", link=reset_link)
```

El **token completo de reset** se escribe en logs. Quien tenga acceso a logs puede secuestrar resets. El token es de uso único, pero hasta su primer uso es una credencial viva.

#### Remediación

Gatear este log con `if settings.is_development:` o eliminarlo en producción.

---

### L-01 🟢 — Logout blocklist usa el JWT completo como clave Redis

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo |
| **Ubicación** | `_backEnd/app/modules/auth/router.py:223` |

`f"token_blocklist:{current_user.token}"` almacena el JWT completo como clave. Funciona, pero genera claves grandes en Redis. Usar el `jti` sería más eficiente.

---

### L-02 🟢 — Linking silencioso de cuentas locales vía Google

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo |
| **Ubicación** | `_backEnd/app/modules/auth/service.py:258-271` |

Si el email de un id_token de Google coincide con un usuario LOCAL existente, la cuenta se re-vincula a Google (`auth_provider=GOOGLE`), se setea `google_sub` y se fuerza `estado=True`. Google verifica el email, así que no es takeover directo, pero el cambio silencioso de proveedor + activación forzada es un comportamiento sorprendente.

---

### L-03 🟢 — `max_length` ausente en campos de token

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo |
| **Ubicación** | `_backEnd/app/modules/auth/schemas.py:72-75, 21-23, 33` |

`id_token`, `refresh_token` y `reset token` no tienen `max_length`, habilitando una superficie de DoS barata (strings enormes → URLs/Redis/logs enormes). Esto **amplifica** el fallo C-01 de ZAP (§3.1).

---

### L-04 🟢 — Acceso al `_session` interno del repositorio desde el servicio

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo (arquitectura) |
| **Ubicación** | `_backEnd/app/modules/auth/service.py:174, 281, 439, 459, 468, 488, 509, 514` |

El servicio ejecuta `select(...)`/`add(...)`/`flush()` directamente sobre `self._repo._session`, rompiendo el patrón repositorio. No es inyección SQL (SQLAlchemy parametriza), pero cualquier futuro error de construcción SQL ocurriría en la capa de servicio, fuera del contrato del repositorio.

---

### I-01 🔵 — 500 NO filtra stack traces al cliente

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `_backEnd/app/middleware/exception_handler.py:89-106` |

Confirmado: el 500 que ZAP obtuvo retorna solo `"Error interno del servidor"`. El traceback va a logs del servidor. **Buena práctica.**

---

### I-02 🔵 — No hay inyección SQL en queries crudas

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `_backEnd/app/infrastructure/workers/tasks/inventory.py:37`, `ventas.py:27`, `database/models/catalogo.py:100` |

Todas las queries `text(...)` son **strings estáticos sin interpolación**. Las demás usan ORM. Búsqueda de `text(f` = 0 resultados. **No hay vectores de inyección SQL.**

---

### I-03 🔵 — Algoritmo JWT fijado (sin alg confusion)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `_backEnd/app/core/security.py:97-103` |

`algorithms=[settings.ALGORITHM]` fija un único algoritmo, previniendo el ataque de confusión `alg=none` / HS↔RS. **Correcto.**

---

### I-04 🔵 — bcrypt para hashing de contraseñas

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `_backEnd/app/core/security.py:21-29` |

Se usa bcrypt vía passlib. Validadores de complejidad exigen ≥1 mayúscula + ≥1 dígito, min 8, max 128. **Correcto.**

---

## 5) 🆕 Hallazgos Adicionales — Frontend

### C-03 🔴 — Tokens JWT (access + refresh) persistidos en `sessionStorage`

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔴 Crítico |
| **Ubicación** | `_frontEnd/src/features/auth/store/auth.store.ts:82-89` |
| **CWE** | CWE-922 (Insecure Storage of Sensitive Information) |

#### Código — `auth.store.ts:80-90`

```typescript
{
  name: 'mitrufely-auth',
  storage: createJSONStorage(() => sessionStorage),
  // Persistimos datos de usuario e identidad, access_token y refresh_token
  partialize: (state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    refreshToken: state.refreshToken,   // ← JWT refresh token persistido
    accessToken: state.accessToken,     // ← JWT access token persistido
  }),
},
```

Y se re-lee al cargar — `auth.store.ts:102`:
```typescript
const persisted = sessionStorage.getItem('mitrufely-auth')
```

#### Contradicción con la documentación

El propio `.env` del frontend declara (líneas 14-15):
```
# El token se almacena en memoria (no en localStorage)
# El refresh token se gestiona vía httpOnly cookie en el backend
```

**Esto es FALSO.** Ambos tokens se escriben en `sessionStorage` (clave `mitrufely-auth`), que es completamente legible por cualquier JavaScript en ejecución (XSS) y sobrevive a recargas dentro de la pestaña. Cualquier XSS — incluso un script de terceros comprometido — puede exfiltrar ambos tokens.

#### Remediación

- Access token: mantenerlo **solo en memoria** (variable de módulo), no persistirlo.
- Refresh token: usar **cookie httpOnly, Secure, SameSite** gestionada por el backend (como dice la doc).

---

### C-04 🔴 — `.env` del frontend commiteado a git con Google Client ID

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔴 Crítico |
| **Ubicación** | `_frontEnd/.env` (trackeado en git), `_frontEnd/.gitignore` (solo excluye `*.local`) |
| **CWE** | CWE-540, CWE-312 |

#### Evidencia

`git ls-files _frontEnd/.env` → el archivo **está trackeado**. El commit que lo añadió: `3c842f9` ("feat: implement full authentication module..."). El `.gitignore` del frontend solo excluye `*.local`, **no `.env`**.

#### Contenido sensible commiteado

```
VITE_GOOGLE_CLIENT_ID=264198079598-tt28nvaod4f740q778ivtvueubgi0iel.apps.googleusercontent.com
```

Aunque los OAuth Client IDs son semi-públicos (se incluyen en el bundle del navegador), commitearlos en un `.env` documenta malas prácticas de higiene de secretos y el archivo queda **permanentemente en el historial de git**.

#### Remediación

1. Añadir `.env` a `_frontEnd/.gitignore`.
2. Mover valores reales a `.env.local` (que sí está ignorado).
3. **Rotar** el Google Client ID (o al menos auditar los orígenes autorizados en Google Console).
4. Limpiar el historial con `git filter-repo` o BFG.

---

### H-06 🟠 — Logout nunca invoca al backend (refresh tokens no se invalidan)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟠 Alto |
| **Ubicación** | Todos los `handleLogout`: `AdminLayout.tsx:60-64`, `CustomerOrdersPage.tsx:58`, `HomePage.tsx:62`, `CatalogPage.tsx:216`, `CartView.tsx:126`, etc. |
| **CWE** | CWE-613 |

Todos los handlers de logout llaman solo a la acción local del store (`logout()`), que limpia memoria + `sessionStorage`. **Nunca llaman a `authApi.logout()`** (`POST /auth/logout`, definido en `auth.api.ts:64-66` pero con **0 llamadores** confirmados por grep).

Combinado con C-03, un refresh token en `sessionStorage` sigue válido en el servidor tras logout. Si fue exfiltrado antes, es usable hasta 7 días (`VITE_REFRESH_EXPIRES_IN=7d`).

#### Remediación

Llamar a `authApi.logout()` antes de limpiar el store local en todos los `handleLogout`.

---

### M-08 🟡 — Google OAuth usa flujo implícito deprecado (`response_type=id_token`)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_frontEnd/src/features/auth/pages/LoginPage.tsx:31-37`, `AuthCallbackPage.tsx:16-24` |
| **CWE** | CWE-668 |

El flujo implícito está deprecado por Google en favor del **Authorization Code + PKCE**. El `id_token` llega en el fragmento/query de la URL, legible por cualquier script de la página.

#### Remediación

Migrar a Authorization Code flow con PKCE usando `@react-oauth/google` o la librería oficial Google Identity Services.

---

### M-09 🟡 — `redirect_uri` de Google hardcoded a `http://localhost:5173`

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_frontEnd/src/features/auth/pages/LoginPage.tsx:27` |

```typescript
const redirectUri = 'http://localhost:5173/auth/callback'
```

No es configurable vía env y es HTTP (no HTTPS). El login con Google está **roto en producción** y requeriría un rebuild para cambiar. Debería ser `import.meta.env['VITE_GOOGLE_REDIRECT_URI']` con un valor HTTPS.

---

### M-10 🟡 — Sin headers de seguridad en nginx + sin HTTPS

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_frontEnd/nginx.conf:12-76` |

La config de nginx define cache y gzip pero **ningún** `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. Además `listen 80` solo, sin TLS ni redirección a 443. Con los tokens en `sessionStorage` (C-03), la ausencia de CSP **aumenta materialmente** la explotabilidad de XSS.

---

### L-05 🟢 — Store de auth duplicado y obsoleto

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo (mantenibilidad + seguridad) |
| **Ubicación** | `_frontEnd/src/stores/auth.store.ts` (obsoleto) vs `_frontEnd/src/features/auth/store/auth.store.ts` (activo) |

Existen dos implementaciones de `useAuthStore`. La versión obsoleta en `stores/` **no persiste `accessToken`** (comportamiento opuesto al activo). Un futuro desarrollador editando el archivo equivocado podría cambiar silenciosamente la persistencia de tokens o reintroducir `localStorage`.

#### Remediación

Eliminar `_frontEnd/src/stores/auth.store.ts`.

---

### L-06 🟢 — Refresh endpoint usa `axios` global (sin timeout, sin interceptor)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo |
| **Ubicación** | `_frontEnd/src/lib/axios.ts:93-96` |

```typescript
const { data } = await axios.post(... `${BASE_URL}/auth/refresh`, ...)
```

Usa el `axios` global importado, no la instancia `api` configurada → sin timeout de 15s, sin interceptor, y su propia respuesta 401 no se capturaría, **arriesgando un bucle infinito de refresh**.

---

### L-07 🟢 — Rol JWT confiado en el cliente sin verificación de firma

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo (defensa en profundidad) |
| **Ubicación** | `_frontEnd/src/features/auth/hooks/useLogin.ts:23-41` |

`decodeJwt` decodifica el payload base64 sin verificar la firma (esperable en frontend). El `role` extraído se usa para RBAC de rutas (`RequirePermission`, `router.tsx:69-87`). Es aceptable **solo si** cada endpoint privilegiado del backend re-verifica el rol. Un token robado/forjado con `role: "ADMIN"` desbloquearía la navegación de admin hasta que el backend rechace las llamadas.

---

### I-05 🔵 — Sin sinks XSS evidentes (positivo)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `_frontEnd/src/` |

Búsqueda de `dangerouslySetInnerHTML`, `innerHTML`, `eval(`, `document.cookie` = **0 resultados**. Inputs de contraseña usan `type="password"`. No se encontraron `console.log` de credenciales. **Buenas prácticas.**

---

### I-06 🔵 — Sourcemaps deshabilitados en producción (positivo)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `_frontEnd/vite.config.ts:62` |

`sourcemap: mode !== 'production'`. Confirmado: no hay `.map` en `dist/`. **Correcto.**

---

### I-07 🔵 — Dependencias actuales/sanas

`_frontEnd/package.json`: axios `^1.9.0`, react `^19.2.6`, vite `^8.0.12`, react-router `^7.6.1`, zod `^3.25.76`, zustand `^5.0.14`. Ningún rango coincide con versiones conocidas como vulnerables. Recomendado: `npm audit --omit=dev` en CI.

---

## 6) 🆕 Hallazgos Adicionales — Infraestructura / Docker

### M-11 🟡 — Celery ejecuta como root (`C_FORCE_ROOT=true`)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_backEnd/docker-compose.yml:95,131`, `docker-compose.yml:136,172` |

`C_FORCE_ROOT=true` fuerza a Celery a correr como root en los contenedores dev. Celery lo desaconseja explícitamente. Si la imagen dev se reutilizara en producción, la ejecución de código en un task sería a nivel root.

---

### M-12 🟡 — Token de webhook débil y predecible

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `docker-compose.yml:81` (`DELIVERY_WEBHOOK_TOKEN=dev-webhook-token`), `_deliveryService/main.py:30` |

```python
DELIVERY_WEBHOOK_TOKEN = os.getenv("DELIVERY_WEBHOOK_TOKEN", "dev-webhook-token")
```

Token trivialmente adivinable. Si el backend confía en este token para autenticar webhooks de delivery, cualquier caller que conozca este valor público puede **falsificar webhooks de entrega completada**.

#### Remediación

Generar un secreto aleatorio de ≥32 bytes por entorno y exigirlo en producción (sin default).

---

### L-08 🟢 — Redis sin autenticación

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo |
| **Ubicación** | `_backEnd/docker-compose.yml:53`, `docker-compose.yml:92` |

`redis-server --port 6399 --maxmemory 256mb --maxmemory-policy allkeys-lru` — sin `requirepass`, sin ACL, sin TLS. Redis guarda contadores de rate-limit, JTIs de reset y carritos. Aceptable en una red bridge aislada, pero si Redis se expone, es lectura/escritura libre.

---

### I-08 🔵 — Contenedor de producción no-root (positivo)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `_backEnd/Dockerfile:58-68` |

El stage de producción crea `appuser`/`appgroup` y usa `USER appuser`. **Correcto.**

---

### I-09 🔵 — Puertos bind a localhost (positivo)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `docker-compose.yml` (puertos `127.0.0.1:...`) |

API, Redis, frontend y delivery están bound al loopback. **No expuestos externamente.**

---

### I-10 🔵 — Email usa STARTTLS; Cloudinary usa `secure=True`; DB exige SSL (positivos)

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🔵 Informativo (positivo) |
| **Ubicación** | `email/service.py:268-270`, `cloudinary_service.py:35-40`, `database/session.py:50,67,83` |

- SMTP usa `starttls()` antes de `login()`.
- Cloudinary config con `secure=True`.
- DB detecta `sslmode` en la URL e inyecta `connect_args={"ssl": True}`.

> ⚠️ Caveat DB: si se provee un `DATABASE_URL` sin `sslmode`, SSL cae silenciosamente a off. Forzar `ssl=True` en producción.

---

## 7) 🆕 Hallazgos Adicionales — Microservicio de Delivery

### M-13 🟡 — Endpoints de delivery sin autenticación

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟡 Medio |
| **Ubicación** | `_deliveryService/main.py:75` (`POST /deliveries`), `:99` (`GET /deliveries/{id}`) |
| **CWE** | CWE-306 |

`POST /deliveries` y `GET /deliveries/{id}` **no tienen autenticación**. CORS permite `http://localhost:8000` y `http://localhost:5173` con `allow_headers=["*"]`. Quien alcance el puerto 8001 puede generar entregas.

#### Remediación

Restringir a la IP del backend o añadir un header de secreto compartido.

---

### L-09 🟢 — Estado en memoria sin idempotencia

| Atributo | Valor |
|----------|-------|
| **Severidad** | 🟢 Bajo |
| **Ubicación** | `_deliveryService/main.py:51` |

`deliveries: dict` en memoria — los reinicios pierden entregas en vuelo; `POST /deliveries` duplicados sobreescriben. Aceptable para una simulación, marcar si se promueve a producción.

---

## 8) ✅ Aspectos Positivos Detectados

Es importante destacar las **buenas prácticas** ya implementadas, que reducen el riesgo global:

| # | Práctica | Ubicación |
|---|---------|-----------|
| 1 | bcrypt para hashing de contraseñas | `core/security.py:21-29` |
| 2 | Algoritmo JWT fijado (sin alg confusion) | `core/security.py:97-103` |
| 3 | Refresh token rotation con detección de replay (JTI en Redis) | `auth/service.py:326-385` |
| 4 | Reset token de uso único con JTI aleatorio (uuid4) + TTL 15min | `auth/security.py:82-94`, `service.py:582-600` |
| 5 | Login anti-enumeración (mismo error para usuario inexistente / password incorrecto) | `auth/service.py:116-121` |
| 6 | Forgot-password anti-enumeración (respuesta idéntica siempre) | `auth/service.py:528-565` |
| 7 | No inyección SQL (queries crudas estáticas, resto ORM) | `workers/tasks/*`, `models/*` |
| 8 | 500 no filtra stack traces al cliente | `middleware/exception_handler.py:89-106` |
| 9 | Docs/Swagger condicionales a DEBUG | `main.py:48-50` |
| 10 | `SMTP_PASSWORD` como `SecretStr` | `core/config.py:89` |
| 11 | Cloudinary requiere credenciales en producción | `core/config.py:144-149` |
| 12 | Contenedor producción non-root | `Dockerfile:58-68` |
| 13 | Puertos bind a localhost | `docker-compose.yml` |
| 14 | STARTTLS en email, `secure=True` en Cloudinary, SSL en DB | ver §6 |
| 15 | Frontend sin sinks XSS (`dangerouslySetInnerHTML`, `eval`, etc. = 0) | `_frontEnd/src/` |
| 16 | Sourcemaps deshabilitados en producción | `vite.config.ts:62` |
| 17 | `.env` del backend excluido de git | `_backEnd/.gitignore` |
| 18 | Rate limit manual en login y forgot-password (aunque mejorable) | `auth/router.py:51-72` |
| 19 | IDOR mitigado: endpoints `/me/*` scopean por `current_user.user_id` del JWT | `auth/router.py:229-286` |

---

## 9) 🛠️ Plan de Remediación Priorizado

### 🔴 Crítico — Acción inmediata (esta semana)

| # | Hallazgo | Acción | Esfuerzo |
|---|---------|--------|----------|
| C-01 | Auto-admin por dominio de email | Eliminar auto-promoción; provisionar admins vía seed/invitación | Medio |
| C-02 | Secretos en `_backEnd/.env` | Rotar TODOS los secretos; migrar a gestor de secretos; correr `gitleaks` | Medio |
| C-03 | Tokens en `sessionStorage` | Access token solo en memoria; refresh token en cookie httpOnly | Alto |
| C-04 | `.env` frontend en git | Remover de git, añadir a `.gitignore`, limpiar historial, rotar Client ID | Bajo |

### 🟠 Alto — Corto plazo (2 semanas)

| # | Hallazgo | Acción | Esfuerzo |
|---|---------|--------|----------|
| H-01 | Reset no invalida sesiones | Implementar `token_version` claim + bump en password change | Medio |
| H-02 | Role confiado del JWT | Verificar rol en DB para ops críticas; considerar RS256 | Medio |
| H-03 | Sin rate limiting global | Instalar `slowapi`/`fastapi-limiter` + límites por ruta | Bajo |
| H-04 | CORS headers `["*"]` + credentials | Lista explícita de headers; validator anti-`*` | Bajo |
| H-05 | Enumeración en `/register` | Mensaje genérico + envío condicional de email | Bajo |
| H-06 | Logout no llama al backend | Llamar `authApi.logout()` en todos los `handleLogout` | Bajo |

### 🟡 Medio — Medio plazo (1 mes)

| # | Hallazgo | Acción |
|---|---------|--------|
| 3.1 | Format String / 500 en `/auth/google` (ZAP) | Validar `id_token` (pattern + max_length); usar `params=`; ampliar `except` |
| 3.2 | Falta X-Content-Type-Options (ZAP) | Middleware de headers de seguridad |
| 3.3 | Token en URL de verify (ZAP) | Token opaco de uso único en Redis |
| M-01 a M-13 | Ver matriz | Ver detalles en §4–§7 |

### 🟢 Bajo / 🔵 Informativo — Backlog

Incluir en deuda técnica. No bloquean el despliegue pero mejoran la postura de seguridad.

---

## 10) 📋 Matriz de Hallazgos

| ID | Severidad | Componente | Ubicación | CWE | Descripción |
|----|-----------|------------|-----------|-----|-------------|
| **C-01** | 🔴 Crítico | Backend | `auth/service.py:168-192` | CWE-269 | Auto-admin por dominio de email sin verificación |
| **C-02** | 🔴 Crítico | Backend | `_backEnd/.env` | CWE-798 | Secretos de producción en disco |
| **C-03** | 🔴 Crítico | Frontend | `auth.store.ts:82-89` | CWE-922 | Tokens JWT en `sessionStorage` |
| **C-04** | 🔴 Crítico | Frontend | `_frontEnd/.env` (git) | CWE-540 | `.env` commiteado con Client ID |
| **H-01** | 🟠 Alto | Backend | `auth/service.py:602-607` | CWE-613 | Reset no invalida sesiones |
| **H-02** | 🟠 Alto | Backend | `auth/dependencies.py:63-78` | CWE-565 | Role confiado del JWT |
| **H-03** | 🟠 Alto | Backend | `main.py` (ausencia) | CWE-770 | Sin rate limiting global |
| **H-04** | 🟠 Alto | Backend | `main.py:59-61`, `config.py:60` | CWE-942 | CORS headers `*` + credentials |
| **H-05** | 🟠 Alto | Backend | `auth/service.py:159-160` | CWE-204 | Enumeración en `/register` |
| **H-06** | 🟠 Alto | Frontend | múltiples `handleLogout` | CWE-613 | Logout no invalida refresh server-side |
| **ZAP-1** | 🟡 Medio | Backend | `auth/service.py:63` | CWE-134* | Format String Error → 500 en `/auth/google` |
| **M-01** | 🟡 Medio | Backend | `auth/security.py:73-79` | CWE-1284 | Token verify sin uso único |
| **M-02** | 🟡 Medio | Backend | `auth/service.py:326-385` | CWE-613 | Rotación refresh no invalida familia |
| **M-03** | 🟡 Medio | Backend | `auth/dependencies.py:63-78` | CWE-347 | Sin chequeo `type=="access"` |
| **M-04** | 🟡 Medio | Backend | `exception_handler.py:61-87` | CWE-209 | Validación filtra detalles internos |
| **M-05** | 🟡 Medio | Backend | `auth/router.py:51-72` | CWE-307 | Rate limit solo por IP |
| **M-06** | 🟡 Medio | Infra | `docker-compose.yml:34` | — | `DEBUG=true` forzado + Swagger expuesto |
| **M-07** | 🟡 Medio | Backend | `email/service.py:85-86` | CWE-532 | Reset token en logs |
| **M-08** | 🟡 Medio | Frontend | `LoginPage.tsx:31-37` | CWE-668 | Google OAuth flujo implícito deprecado |
| **M-09** | 🟡 Medio | Frontend | `LoginPage.tsx:27` | — | redirect_uri hardcoded localhost HTTP |
| **M-10** | 🟡 Medio | Frontend | `nginx.conf:12-76` | — | Sin headers de seguridad + sin HTTPS |
| **M-11** | 🟡 Medio | Infra | `docker-compose.yml:95` | — | Celery como root |
| **M-12** | 🟡 Medio | Infra | `docker-compose.yml:81` | CWE-330 | Webhook token débil |
| **M-13** | 🟡 Medio | Delivery | `deliveryService/main.py:75` | CWE-306 | Endpoints sin auth |
| **ZAP-2** | 🟢 Bajo | Backend | `main.py:55-64` | CWE-693 | Falta X-Content-Type-Options (systemic) |
| **L-01** | 🟢 Bajo | Backend | `auth/router.py:223` | — | Blocklist usa JWT completo como clave |
| **L-02** | 🟢 Bajo | Backend | `auth/service.py:258-271` | — | Linking silencioso vía Google |
| **L-03** | 🟢 Bajo | Backend | `auth/schemas.py:72-75` | CWE-400 | Sin `max_length` en tokens |
| **L-04** | 🟢 Bajo | Backend | `auth/service.py` (varias) | — | Servicio accede a `_session` interno |
| **L-05** | 🟢 Bajo | Frontend | `stores/auth.store.ts` | — | Store de auth duplicado obsoleto |
| **L-06** | 🟢 Bajo | Frontend | `lib/axios.ts:93-96` | — | Refresh usa axios global |
| **L-07** | 🟢 Bajo | Frontend | `useLogin.ts:23-41` | CWE-347 | Rol JWT no verificado en cliente |
| **L-08** | 🟢 Bajo | Infra | `docker-compose.yml:53` | — | Redis sin auth |
| **L-09** | 🟢 Bajo | Delivery | `deliveryService/main.py:51` | — | Estado en memoria sin idempotencia |
| **ZAP-3** | 🔵 Info | Backend | `auth/router.py:128-139` | CWE-598 | Token en URL de verify |
| **ZAP-4** | 🔵 Info | Backend | `auth/router.py` (login) | — | Petición de auth identificada |
| **I-01 a I-10** | 🔵 Info | Varios | ver §8 | — | 10 aspectos positivos |

> *ZAP-1: clasificación de ZAP (CWE-134) es inexacta; la clase real es CWE-20/CWE-75. Ver §3.1.

---

## 11) 📎 Anexo — Cobertura del Escaneo ZAP

### Estadísticas del escaneo (del reporte ZAP)

| Métrica | Valor |
|---------|-------|
| Sitio escaneado | `http://localhost:8000` |
| Total de endpoints descubiertos | 131 |
| Endpoints GET | 48% |
| Endpoints POST | 16% |
| Endpoints PUT | 27% |
| Endpoints DELETE | 4% |
| Endpoints PATCH | 2% |
| Respuestas 2xx | 1% |
| Respuestas 3xx | 1% |
| Respuestas 4xx | **97%** ⚠️ |
| Respuestas 5xx | 2% |
| Endpoints `application/json` | 100% |
| Respuestas lentas | 12% |
| Errores de ZAP registrados | 6 |
| Warnings de ZAP | 36 |

### ⚠️ Observación sobre la cobertura

El **97% de respuestas 4xx** indica que ZAP no estaba autenticado y la mayoría de endpoints protegidos rechazaron las peticiones. Esto significa que **ZAP escaneó principalmente la superficie no autenticada**. Endpoints tras autenticación (pedidos, carrito, inventario, reportes, dashboard admin) **no fueron probados en profundidad**. Para una cobertura completa, se recomienda configurar la autenticación de ZAP con un usuario de prueba y re-ejecutar.

### Limitaciones del escaneo automatizado detectadas

ZAP **no detectó** (y no puede detectar por diseño automatizado):

- La escalada de privilegios por dominio de email (C-01) — es un fallo de lógica de negocio.
- Los secretos en disco (C-02) — no es una vulnerabilidad HTTP.
- Los tokens en `sessionStorage` (C-03) — es comportamiento del cliente.
- El `.env` commiteado (C-04) — es un fallo de repositorio.
- La falta de invalidación de sesiones (H-01) — requiere análisis de flujo.
- La enumeración en `/register` (H-05) — requiere comparar respuestas.
- La ausencia de rate limiting global (H-03) — ZAP solo probó endpoints puntuales.

> **Conclusión:** El escaneo ZAP es un primer filtro valioso, pero debe complementarse obligatoriamente con revisión manual de código y pruebas de lógica de negocio para una auditoría de seguridad completa.

---

## 📁 Archivos de referencia

| Archivo | Propósito |
|---------|-----------|
| `ZAP por Informe de Escaneo Checkmarx.html` | Reporte ZAP original (11-jul-2026) |
| `_docs/PruebaDeSeguridad/Auditoria_Seguridad_MitrufelyWeb.md` | Este informe |
| `PRUEBA_SEGURIDAD_ZAP.md` | Guía de la prueba ZAP (tareas A/B) |

---

*Fin del informe.*
