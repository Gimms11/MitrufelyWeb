# SKILL 03 — Autenticación y RBAC (JWT + Roles)

> **CUÁNDO USAR:** Antes de implementar endpoints protegidos, lógica de login/registro, o validación de roles.

---

## 1. Modelo de Roles (DB → Backend)

### En la Base de Datos
```sql
CREATE TYPE tipo_rol_enum AS ENUM ('ADMIN', 'CLIENTE', 'CAJERO', 'ALMACEN');
CREATE TABLE roles (id_rol serial PRIMARY KEY, nombre tipo_rol_enum UNIQUE NOT NULL);
```

### En Python (`app/core/constants.py`)
```python
class UserRole(StrEnum):
    ADMIN = "ADMIN"
    CLIENT = "CLIENTE"

# ⚠️ PENDIENTE: Agregar CAJERO y ALMACEN cuando se implementen sus módulos
# UserRole.CASHIER = "CAJERO"
# UserRole.WAREHOUSE = "ALMACEN"
```

### Matriz de Permisos (`ROLE_PERMISSIONS`)
```python
ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.ADMIN: set(Permission),  # Todos los permisos
    UserRole.CLIENT: {
        Permission.PRODUCT_READ,
        Permission.ORDER_READ_OWN,
        Permission.ORDER_CREATE,
        Permission.USER_READ_OWN,
        Permission.SWEETCOINS_READ,
    },
}
```

### Permisos disponibles (`Permission(StrEnum)`)
```python
# Inventario
INVENTORY_READ, INVENTORY_WRITE, INVENTORY_DELETE

# Órdenes/Ventas
ORDER_READ_OWN, ORDER_READ_ALL, ORDER_CREATE, ORDER_UPDATE

# Productos
PRODUCT_READ, PRODUCT_WRITE, PRODUCT_DELETE

# Usuarios
USER_READ_OWN, USER_READ_ALL, USER_UPDATE

# Reportes y Dashboard
REPORT_GENERATE, DASHBOARD_READ

# SweetCoins
SWEETCOINS_READ, SWEETCOINS_ADJUST
```

---

## 2. JWT — Configuración

| Parámetro | Valor |
|---|---|
| Algoritmo | `HS256` |
| Clave | `settings.SECRET_KEY` (min 32 chars, en `.env`) |
| Access Token TTL | `settings.ACCESS_TOKEN_EXPIRE_MINUTES` (60 min) |
| Refresh Token TTL | `settings.REFRESH_TOKEN_EXPIRE_DAYS` (30 días) |

### Payload del Access Token
```python
{
    "sub": str(user.id_usuario),   # Subject = user ID
    "role": "ADMIN",               # Rol del usuario
    "type": "access",
    "iat": datetime,
    "exp": datetime,
}
```

### Payload del Refresh Token
```python
{
    "sub": str(user.id_usuario),
    "type": "refresh",
    "iat": datetime,
    "exp": datetime,
}
```

---

## 3. Funciones de Seguridad (`app/core/security.py`)

```python
# Hash de contraseña
hash_password(plain: str) -> str
verify_password(plain: str, hashed: str) -> bool

# Creación de tokens
create_access_token(subject: str, role: str, extra: dict | None) -> str
create_refresh_token(subject: str) -> str

# Validación de token (lanza InvalidTokenError si falla)
decode_token(token: str) -> dict[str, Any]
```

---

## 4. Dependencias FastAPI (`app/security/dependencies.py`)

### Patrón estándar para dependencias de seguridad:

```python
from typing import Annotated
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> UsuarioModel:
    """Valida JWT y retorna el usuario activo."""
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise InvalidTokenError()
    user_id = int(payload["sub"])
    # Consultar usuario en DB...
    if not user or not user.estado:
        raise UnauthorizedError("Usuario inactivo o no encontrado")
    return user


async def get_current_active_admin(
    current_user: Annotated[UsuarioModel, Depends(get_current_user)],
) -> UsuarioModel:
    """Verifica rol ADMIN."""
    if current_user.rol.nombre != "ADMIN":
        raise InsufficientRoleError()
    return current_user


def require_permissions(*permissions: Permission):
    """Factory de dependencia para permisos granulares."""
    async def _check(
        current_user: Annotated[UsuarioModel, Depends(get_current_user)],
    ) -> UsuarioModel:
        user_role = UserRole(current_user.rol.nombre)
        allowed = ROLE_PERMISSIONS.get(user_role, set())
        if not all(p in allowed for p in permissions):
            raise InsufficientRoleError()
        return current_user
    return _check
```

---

## 5. Uso en Routers

```python
# Endpoint solo autenticado
@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[UsuarioModel, Depends(get_current_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)


# Endpoint solo ADMIN
@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    _: Annotated[UsuarioModel, Depends(get_current_active_admin)],
    service: Annotated[UserService, Depends(get_user_service)],
) -> MessageResponse:
    await service.delete(user_id)
    return MessageResponse(message="Usuario eliminado")


# Endpoint con permiso específico
@router.post("/adjust")
async def adjust_stock(
    _: Annotated[UsuarioModel, Depends(require_permissions(Permission.INVENTORY_WRITE))],
    ...
```

---

## 6. Flujo de Autenticación (Login)

```
POST /api/v1/auth/login
Body: { email, password }
                ↓
AuthService.login()
    ├── repo.get_by_email(email)        → UsuarioModel | None
    ├── verify_password(plain, hash)    → bool
    ├── if not user.estado → raise UnauthorizedError ("Cuenta no verificada")
    ├── create_access_token(sub=user_id, role=role_name, extra={"email"})
    └── create_refresh_token(sub=user_id)
                ↓
Response: { access_token, refresh_token, token_type: "bearer", expires_in: 3600 }
```

---

## 7. Flujo de Registro Transaccional Dinámico y Verificación de Email

### Workflow de Registro (`POST /api/v1/auth/register`)
1. **Detección de Rol por Dominio**: El backend comprueba si el correo pertenece al dominio administrador especial configurado (`settings.ADMIN_EMAIL_DOMAIN`, por defecto `@mitrufely.com`).
   * **Es Admin**: Se le asigna rol `ADMIN` y `estado = True` (activado inmediatamente, **no** requiere correo).
   * **Es Cliente**: Se le asigna rol `CLIENTE`, `estado = False` (requiere verificación) y se crea atómicamente en la misma transacción su perfil extendido en la tabla `clientes`.
2. **Generación de Token de Verificación**: Para los clientes se crea un JWT de corta duración (24 horas) con `"type": "verification"`.
3. **Envío de Correo Asíncrono**: Se programa una `BackgroundTask` que ejecuta en un hilo secundario (`ThreadPoolExecutor`) el envío de un correo HTML responsivo de alta fidelidad con el link de verificación:
   `http://localhost:8000/api/v1/auth/verify?token=<token>`

```
POST /api/v1/auth/register
Body: { first_name, last_name, email, password, phone }
                ↓
AuthService.register()
    ├── Valida duplicados de email
    ├── Comprueba dominio especial (ej: @mitrufely.com)
    │     ├── Sí (ADMIN): estado=True, rol="ADMIN"
    │     └── No (CLIENTE): estado=False, rol="CLIENTE", crea Cliente en DB (Transaccional)
    ├── Si es CLIENTE:
    │     ├── Genera token de verificación (JWT 24h, type="verification")
    │     └── BackgroundTask -> EmailService.send_verification_email()
    └── Retorna: { user_id, email, message: "Cuenta creada exitosamente" }
```

### Workflow de Verificación (`GET /api/v1/auth/verify?token=...`)
1. El cliente hace clic en el enlace del correo.
2. El endpoint `/auth/verify` recibe el token, lo decodifica y verifica que `type == "verification"`.
3. Se actualiza el `estado` del usuario a `True` en la base de datos, permitiéndole iniciar sesión a partir de ese momento.

---

## 8. Flujo de Logout y Lista de Bloqueo en Redis

Para garantizar la invalidación real de los JWTs antes de su fecha de expiración natural, se implementa una **Lista de Bloqueo (Blocklist)** en Redis:

1. **Cerrar Sesión (`POST /api/v1/auth/logout`)**:
   * El cliente envía su JWT en los headers de autorización.
   * El backend calcula el tiempo de expiración restante del token:
     `remaining_ttl = exp - current_timestamp`
   * Si el token sigue vigente, se registra en Redis una clave con formato `token_blocklist:{token}` y se le asigna ese `remaining_ttl` como TTL.
2. **Validación en Endpoints Protegidos (`get_current_user`)**:
   * Cada petición autenticada es interceptada por la dependencia.
   * Se comprueba si el token actual existe en la base de datos en caché de Redis.
   * Si existe, se rechaza la petición de inmediato con una excepción `401 Unauthorized ("Token revocado (sesión cerrada)")`.

---

## 9. Relación en la Base de Datos

```
usuarios
  └── id_rol → roles.id_rol
               └── nombre: tipo_rol_enum ('ADMIN'|'CLIENTE'|'CAJERO'|'ALMACEN')

clientes (extensión de usuarios para tipo CLIENTE)
  └── id_usuario → usuarios.id_usuario (UNIQUE, 1-a-1)
```

Al hacer login, el servicio de auth hace JOIN con `roles` para obtener el nombre real del rol y embeberlo en el JWT.

---

## 10. Seguridad de Contraseñas y Tokens

- **Contraseñas**: Hasheadas usando `bcrypt` (vía `passlib`).
- **Verificación en 2 pasos de Gmail**: El backend se comunica con los servidores de Gmail usando el puerto seguro `587` (STARTTLS) utilizando una **Contraseña de Aplicación de 16 caracteres** configurada en `.env` bajo `SMTP_PASSWORD`.
- **Expiración de Tokens**:
  * **Access Token**: 60 minutos (`ACCESS_TOKEN_EXPIRE_MINUTES`).
  * **Refresh Token**: 30 días (`REFRESH_TOKEN_EXPIRE_DAYS`).
  * **Verification Token**: 24 horas (JWT local seguro).
