"""
Mitrufely Web — Users Module Router
Reporte de Gestión de Usuarios (Fase 7).

Endpoints administrativos para listar, consultar y activar/desactivar usuarios.
Protegidos por AdminUser y los permisos USER_READ_ALL / USER_UPDATE.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.constants import Permission
from app.core.exceptions import MifrufelyBaseError
from app.modules.users.dependencies import UsersServiceDep
from app.modules.users.schemas import (
    UserDetailResponse,
    UserEstadoUpdateRequest,
    UserListItemResponse,
)
from app.security.dependencies import AdminUser, require_permission

router = APIRouter(prefix="/admin/users", tags=["Gestión de Usuarios"])


@router.get(
    "",
    response_model=list[UserListItemResponse],
    summary="Reporte de Gestión de Usuarios",
    description=(
        "Lista los usuarios del sistema con su rol, estado de cuenta y actividad. "
        "Permite filtrar por rol (ADMIN/CLIENTE), estado (activo/inactivo) y "
        "búsqueda parcial por nombre o email. "
        "Requiere rol ADMIN o el permiso `user:read:all`."
    ),
    dependencies=[Depends(require_permission(Permission.USER_READ_ALL))],
)
async def list_users(
    service: UsersServiceDep,
    rol: Optional[str] = Query(None, description="Filtrar por rol: ADMIN o CLIENTE."),
    estado: Optional[bool] = Query(None, description="True = activos, False = inactivos."),
    search: Optional[str] = Query(None, description="Búsqueda parcial por nombre o email."),
    limit: int = Query(100, ge=1, le=500, description="Cantidad máxima de registros."),
    offset: int = Query(0, ge=0, description="Desplazamiento de paginación."),
    _: AdminUser = None,  # refuerza la exclusividad ADMIN
) -> list[UserListItemResponse]:
    try:
        return await service.list_users(
            rol=rol, estado=estado, search=search, limit=limit, offset=offset
        )
    except MifrufelyBaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e


@router.get(
    "/{id_usuario}",
    response_model=UserDetailResponse,
    summary="Detalle de un usuario",
    description="Obtiene el detalle completo de un usuario (incluye datos fiscales).",
    dependencies=[Depends(require_permission(Permission.USER_READ_ALL))],
)
async def get_user_detail(
    id_usuario: int,
    service: UsersServiceDep,
    _: AdminUser = None,
) -> UserDetailResponse:
    try:
        return await service.get_user_detail(id_usuario)
    except MifrufelyBaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e


@router.patch(
    "/{id_usuario}/estado",
    response_model=UserListItemResponse,
    summary="Activar / desactivar usuario",
    description=(
        "Cambia el estado de la cuenta de un usuario (activo/inactivo). "
        "No elimina el registro (borrado lógico). Requiere permiso `user:update`."
    ),
    dependencies=[Depends(require_permission(Permission.USER_UPDATE))],
)
async def update_user_estado(
    id_usuario: int,
    payload: UserEstadoUpdateRequest,
    service: UsersServiceDep,
    _: AdminUser = None,
) -> UserListItemResponse:
    try:
        return await service.update_user_estado(id_usuario, payload)
    except MifrufelyBaseError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
