from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.modules.categories.dependencies import get_categoria_service
from app.modules.categories.schemas import (
    CategoriaCreate,
    CategoriaResponse,
    CategoriaUpdate,
    PaginatedResponse,
)
from app.modules.categories.service import CategoriaService
from app.security.dependencies import require_admin

router = APIRouter(prefix="/categorias", tags=["Categorías"])

CategoriaServiceDep = Annotated[CategoriaService, Depends(get_categoria_service)]


@router.get(
    "/",
    response_model=PaginatedResponse[CategoriaResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar categorías activas",
)
async def list_categorias(
    service: CategoriaServiceDep,
    search: str | None = Query(None, description="Buscar por nombre"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[CategoriaResponse]:
    return await service.get_all(page=page, size=size, search=search)


@router.get(
    "/admin",
    response_model=PaginatedResponse[CategoriaResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar todas las categorías (Admin)",
    dependencies=[Depends(require_admin)],
)
async def list_categorias_admin(
    service: CategoriaServiceDep,
    search: str | None = Query(None, description="Buscar por nombre"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> PaginatedResponse[CategoriaResponse]:
    return await service.get_all_admin(page=page, size=size, search=search)


@router.get(
    "/{id}",
    response_model=CategoriaResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener categoría por ID",
)
async def get_categoria(
    id: int,
    service: CategoriaServiceDep,
) -> CategoriaResponse:
    return await service.get_by_id(id)


@router.post(
    "/",
    response_model=CategoriaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear categoría",
    dependencies=[Depends(require_admin)],
)
async def create_categoria(
    body: CategoriaCreate,
    service: CategoriaServiceDep,
) -> CategoriaResponse:
    return await service.create(body)


@router.put(
    "/{id}",
    response_model=CategoriaResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar categoría",
    dependencies=[Depends(require_admin)],
)
async def update_categoria(
    id: int,
    body: CategoriaUpdate,
    service: CategoriaServiceDep,
) -> CategoriaResponse:
    return await service.update(id, body)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar categoría (Soft Delete)",
    dependencies=[Depends(require_admin)],
)
async def delete_categoria(
    id: int,
    service: CategoriaServiceDep,
) -> None:
    await service.delete(id)
