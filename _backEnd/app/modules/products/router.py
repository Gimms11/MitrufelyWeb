from typing import Annotated, List, Optional
import json

from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile

from app.modules.products.dependencies import get_paquete_service
from app.modules.products.schemas import (
    PaqueteCreate,
    PaqueteResponse,
    PaqueteUpdate,
    PaqueteProductoCreate,
)
from app.modules.products.service import PaqueteService
from app.routers.storage import get_storage_service
from app.infrastructure.storage.cloudinary_service import CloudinaryService
from app.security.dependencies import require_admin
from app.infrastructure.database.models.enums import TipoRolEnum

router = APIRouter(prefix="/packages", tags=["Packages"])

PaqueteServiceDep = Annotated[PaqueteService, Depends(get_paquete_service)]


@router.get(
    "/",
    response_model=List[PaqueteResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar paquetes disponibles",
)
async def list_packages(
    service: PaqueteServiceDep,
    limit: int = 100,
    offset: int = 0,
) -> List[PaqueteResponse]:
    """Retorna los paquetes disponibles (con disponibilidad dinámica = True)"""
    return await service.get_all(limit=limit, offset=offset)


@router.get(
    "/admin",
    response_model=List[PaqueteResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar todos los paquetes (Admin)",
    dependencies=[Depends(require_admin)],
)
async def list_packages_admin(
    service: PaqueteServiceDep,
    limit: int = 100,
    offset: int = 0,
) -> List[PaqueteResponse]:
    """Retorna todos los paquetes, sin importar su disponibilidad, para el panel administrativo"""
    return await service.get_all_admin(limit=limit, offset=offset)


@router.get(
    "/slug/{slug}",
    response_model=PaqueteResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener detalle de un paquete por slug",
)
async def get_package_by_slug(
    slug: str,
    service: PaqueteServiceDep,
) -> PaqueteResponse:
    paquete = await service.get_by_slug(slug)
    if not paquete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paquete no encontrado",
        )
    return paquete


@router.get(
    "/{id}",
    response_model=PaqueteResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener detalle de un paquete",
)
async def get_package(
    id: int,
    service: PaqueteServiceDep,
) -> PaqueteResponse:
    paquete = await service.get_by_id(id)
    if not paquete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paquete no encontrado",
        )
    return paquete


@router.post(
    "/",
    response_model=PaqueteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo paquete",
    dependencies=[Depends(require_admin)],
)
async def create_package(
    service: PaqueteServiceDep,
    nombre: str = Form(...),
    slug: str = Form(...),
    descripcion: Optional[str] = Form(None),
    estado: bool = Form(True),
    productos_json: str = Form(...),
    image: Optional[UploadFile] = File(None),
    storage_service: CloudinaryService = Depends(get_storage_service),
) -> PaqueteResponse:
    # 1. Parsear productos_json
    try:
        productos_list = json.loads(productos_json)
        if not isinstance(productos_list, list):
            raise ValueError
        productos_dto = [PaqueteProductoCreate(**p) for p in productos_list]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="productos_json debe ser una lista JSON válida de productos con id_producto y cantidad.",
        )

    # 2. Instanciar PaqueteCreate
    payload = PaqueteCreate(
        nombre=nombre, slug=slug, descripcion=descripcion, estado=estado, productos=productos_dto
    )

    # 3. Invocar service.create_with_image
    return await service.create_with_image(payload, image, storage_service)


@router.put(
    "/{id}",
    response_model=PaqueteResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar paquete",
    dependencies=[Depends(require_admin)],
)
async def update_package(
    id: int,
    service: PaqueteServiceDep,
    nombre: Optional[str] = Form(None),
    slug: Optional[str] = Form(None),
    descripcion: Optional[str] = Form(None),
    estado: Optional[bool] = Form(None),
    productos_json: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    storage_service: CloudinaryService = Depends(get_storage_service),
) -> PaqueteResponse:
    # 1. Parsear productos_json opcional
    productos_dto = None
    if productos_json is not None:
        try:
            productos_list = json.loads(productos_json)
            if not isinstance(productos_list, list):
                raise ValueError
            productos_dto = [PaqueteProductoCreate(**p) for p in productos_list]
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="productos_json debe ser una lista JSON válida.",
            )

    # 2. Instanciar PaqueteUpdate
    payload = PaqueteUpdate(
        nombre=nombre, slug=slug, descripcion=descripcion, estado=estado, productos=productos_dto
    )

    # 3. Invocar service.update_with_image
    paquete = await service.update_with_image(id, payload, image, storage_service)
    if not paquete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paquete no encontrado",
        )
    return paquete


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar paquete (Soft Delete)",
    dependencies=[Depends(require_admin)],
)
async def delete_package(
    id: int,
    service: PaqueteServiceDep,
) -> None:
    deleted = await service.delete(id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paquete no encontrado",
        )
