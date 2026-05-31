from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile, Query, Request

from app.modules.products.dependencies import get_producto_service
from app.modules.products.schemas import ProductoCreate, ProductoResponse, ProductoUpdate, PaginatedResponse
from app.modules.products.service import ProductoService
from app.routers.storage import get_storage_service
from app.infrastructure.storage.cloudinary_service import CloudinaryService
from app.security.dependencies import require_admin

router = APIRouter(prefix="/products", tags=["Products"])

ProductoServiceDep = Annotated[ProductoService, Depends(get_producto_service)]


@router.get(
    "/",
    response_model=PaginatedResponse[ProductoResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar productos disponibles (Cliente)",
)
async def list_products(
    service: ProductoServiceDep,
    search: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort: Optional[str] = Query(None),
) -> PaginatedResponse[ProductoResponse]:
    """Retorna únicamente productos con estado=true y stock_actual > 0 para clientes."""
    return await service.get_paginated(
        search=search,
        categoria=categoria,
        activo=True,
        stock="available",
        page=page,
        size=size,
        sort=sort
    )


@router.get(
    "/admin",
    response_model=PaginatedResponse[ProductoResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar todos los productos (Administración)",
    dependencies=[Depends(require_admin)],
)
async def list_products_admin(
    service: ProductoServiceDep,
    search: Optional[str] = Query(None),
    categoria: Optional[str] = Query(None),
    activo: Optional[bool] = Query(None),
    stock: Optional[str] = Query(None, description="'available' o 'out_of_stock'"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    sort: Optional[str] = Query(None),
) -> PaginatedResponse[ProductoResponse]:
    """Retorna todos los productos sin restricciones automáticas para administradores."""
    return await service.get_paginated(
        search=search,
        categoria=categoria,
        activo=activo,
        stock=stock,
        page=page,
        size=size,
        sort=sort
    )


@router.get(
    "/{id}",
    response_model=ProductoResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener detalle de un producto",
)
async def get_product(
    id: int,
    service: ProductoServiceDep,
) -> ProductoResponse:
    producto = await service.get_by_id(id)
    if not producto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
    return producto


@router.post(
    "/",
    response_model=ProductoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un nuevo producto",
    dependencies=[Depends(require_admin)],
)
async def create_product(
    service: ProductoServiceDep,
    nombre: str = Form(...),
    precio: Decimal = Form(...),
    id_categoria: Optional[str] = Form(None),
    descripcion: Optional[str] = Form(None),
    ingredientes: Optional[str] = Form(None),
    alergenos: Optional[str] = Form(None),
    peso_gramos: Optional[str] = Form(None),
    stock_minimo: int = Form(0),
    estado: bool = Form(True),
    image: Optional[UploadFile] = File(None),
    storage_service: CloudinaryService = Depends(get_storage_service),
) -> ProductoResponse:
    parsed_id_categoria = None
    if id_categoria and id_categoria.strip() and id_categoria != "null":
        try:
            parsed_id_categoria = int(id_categoria)
        except ValueError:
            parsed_id_categoria = None

    parsed_peso_gramos = None
    if peso_gramos and peso_gramos.strip() and peso_gramos != "null":
        try:
            parsed_peso_gramos = Decimal(peso_gramos)
        except Exception:
            parsed_peso_gramos = None

    payload = ProductoCreate(
        nombre=nombre,
        precio=precio,
        id_categoria=parsed_id_categoria,
        descripcion=descripcion,
        ingredientes=ingredientes,
        alergenos=alergenos,
        peso_gramos=parsed_peso_gramos,
        stock_minimo=stock_minimo,
        estado=estado
    )

    try:
        return await service.create_with_image(payload, image, storage_service)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.put(
    "/{id}",
    response_model=ProductoResponse,
    status_code=status.HTTP_200_OK,
    summary="Actualizar producto",
    dependencies=[Depends(require_admin)],
)
async def update_product(
    id: int,
    service: ProductoServiceDep,
    request: Request,
    nombre: Optional[str] = Form(None),
    precio: Optional[Decimal] = Form(None),
    id_categoria: Optional[str] = Form(None),
    descripcion: Optional[str] = Form(None),
    ingredientes: Optional[str] = Form(None),
    alergenos: Optional[str] = Form(None),
    peso_gramos: Optional[str] = Form(None),
    stock_minimo: Optional[int] = Form(None),
    estado: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    storage_service: CloudinaryService = Depends(get_storage_service),
) -> ProductoResponse:
    form_data = await request.form()
    update_data = {}
    
    if "nombre" in form_data:
        update_data["nombre"] = nombre
    if "precio" in form_data:
        update_data["precio"] = precio
    if "id_categoria" in form_data:
        val = form_data.get("id_categoria")
        if val == "" or val == "null" or val is None or str(val).strip() == "":
            update_data["id_categoria"] = None
        else:
            try:
                update_data["id_categoria"] = int(str(val))
            except ValueError:
                update_data["id_categoria"] = None
    if "descripcion" in form_data:
        update_data["descripcion"] = descripcion
    if "ingredientes" in form_data:
        update_data["ingredientes"] = ingredientes
    if "alergenos" in form_data:
        update_data["alergenos"] = alergenos
    if "peso_gramos" in form_data:
        val = form_data.get("peso_gramos")
        if val == "" or val == "null" or val is None or str(val).strip() == "":
            update_data["peso_gramos"] = None
        else:
            try:
                update_data["peso_gramos"] = Decimal(str(val))
            except Exception:
                update_data["peso_gramos"] = None
    if "stock_minimo" in form_data:
        update_data["stock_minimo"] = stock_minimo
    if "estado" in form_data:
        update_data["estado"] = estado

    payload = ProductoUpdate(**update_data)

    try:
        producto = await service.update_with_image(id, payload, image, storage_service)
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Producto no encontrado",
            )
        return producto
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar producto (Soft Delete)",
    dependencies=[Depends(require_admin)],
)
async def delete_product(
    id: int,
    service: ProductoServiceDep,
) -> None:
    deleted = await service.delete(id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Producto no encontrado",
        )
