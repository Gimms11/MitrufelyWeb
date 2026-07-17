"""
Mitrufely Web — Users Module Schemas
Reporte de Gestión de Usuarios (Fase 7).
Esquemas Pydantic v2 para listar y administrar usuarios del sistema.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RolUsuarioResponse(BaseModel):
    """Rol del usuario en el sistema."""

    model_config = ConfigDict(from_attributes=True)

    id_rol: int = Field(..., description="Identificador único del rol.")
    nombre: str = Field(..., description="Nombre del rol (ADMIN / CLIENTE).")


class ClienteInfoResponse(BaseModel):
    """Información del perfil cliente (si aplica)."""

    model_config = ConfigDict(from_attributes=True)

    id_cliente: int
    direccion: Optional[str] = None
    telefono: Optional[str] = None


class UserListItemResponse(BaseModel):
    """
    Item del Reporte de Gestión de Usuarios.
    Reúne datos de identidad, rol, estado de cuenta y actividad básica.
    """

    model_config = ConfigDict(from_attributes=True)

    id_usuario: int = Field(..., description="ID del usuario.")
    nombres: str
    apellidos: str
    email: str = Field(..., description="Email único de la cuenta.")
    telefono: Optional[str] = None
    estado: bool = Field(..., description="Estado activo o inactivo del usuario.")
    auth_provider: str = Field(..., description="Origen de autenticación (local / google).")
    avatar_url: str | None = Field(None, description="URL de la foto de perfil.")

    model_config = ConfigDict(from_attributes=True)
    rol: RolUsuarioResponse
    cliente: Optional[ClienteInfoResponse] = None
    # Métricas de actividad (calculadas, no persistidas directamente)
    total_ventas: int = Field(0, description="Número de ventas asociadas (clientes).")
    ultima_actividad: Optional[datetime] = Field(
        None, description="Fecha del último log registrado para el usuario."
    )


class UserDetailResponse(UserListItemResponse):
    """Detalle extendido de un usuario (incluye datos fiscales)."""

    documento_fiscal: Optional[str] = Field(
        None, description="Número de documento fiscal (DNI/RUC) si existe."
    )
    tipo_documento_fiscal: Optional[str] = None
    razon_social: Optional[str] = None


class UserEstadoUpdateRequest(BaseModel):
    """Payload para activar / desactivar una cuenta de usuario."""

    estado: bool = Field(..., description="Nuevo estado de la cuenta.")


class UserFiltersRequest(BaseModel):
    """Filtros del Reporte de Gestión de Usuarios."""

    rol: Optional[str] = Field(None, description="Filtrar por rol (ADMIN / CLIENTE).")
    estado: Optional[bool] = Field(None, description="Filtrar por estado de cuenta.")
    search: Optional[str] = Field(
        None, description="Búsqueda por nombre, apellido o email (parcial, insensible)."
    )
