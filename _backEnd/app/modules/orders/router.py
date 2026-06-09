from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from redis.asyncio import Redis

from app.core.exceptions import BusinessRuleError
from app.infrastructure.cache.redis_client import get_redis
from app.infrastructure.database.models.enums import OrigenVentaEnum, TipoPagoEnum
from app.modules.cart.schemas import CartCheckoutResponse
from app.modules.cart.service import CartService
from app.modules.orders.dependencies import get_venta_service
from app.modules.orders.schemas import (
    ItemPaquete,
    ItemProducto,
    VentaRequest,
    VentaResponse,
)
from app.modules.orders.service import VentaService
from app.security.dependencies import AdminUser, AuthUser

router = APIRouter(prefix="/ventas", tags=["Ventas"])

VentaServiceDep = Annotated[VentaService, Depends(get_venta_service)]
RedisDep = Annotated[Redis, Depends(get_redis)]


@router.post(
    "/checkout",
    response_model=VentaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Checkout directo con items explícitos",
)
async def checkout(
    payload: VentaRequest,
    current_user: AuthUser,
    service: VentaServiceDep,
) -> VentaResponse:
    return await service.create_checkout(id_cliente=current_user.user_id, dto=payload)


@router.post(
    "/checkout/cart",
    response_model=CartCheckoutResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Checkout desde el carrito Redis",
)
async def checkout_from_cart(
    current_user: AuthUser,
    service: VentaServiceDep,
    redis: RedisDep,
) -> CartCheckoutResponse:
    cart_service = CartService(redis)
    cart = await cart_service.get_cart(user_id=current_user.user_id)

    if not cart.items:
        raise BusinessRuleError("El carrito está vacío.")

    productos = [
        ItemProducto(id_producto=i.id_producto, cantidad=i.cantidad)
        for i in cart.items
        if not i.es_paquete
    ]
    paquetes = [
        ItemPaquete(id_paquete=i.id_paquete, cantidad=i.cantidad)
        for i in cart.items
        if i.es_paquete and i.id_paquete is not None
    ]

    dto = VentaRequest(
        origen_venta=OrigenVentaEnum.WEB,
        productos=productos,
        paquetes=paquetes,
        tipo_pago=TipoPagoEnum.TARJETA,
    )

    result = await service.create_checkout(id_cliente=current_user.user_id, dto=dto)

    await cart_service.clear_cart(user_id=current_user.user_id)

    return CartCheckoutResponse(
        id_venta=result.id_venta,
        total=result.total,
        estado=result.estado,
        estado_pago=result.estado_pago,
    )


@router.put(
    "/{id_venta}/pagar",
    response_model=VentaResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirmar pago (admin / académico)",
)
async def confirmar_pago(
    id_venta: int,
    current_user: AdminUser,
    service: VentaServiceDep,
) -> VentaResponse:
    return await service.confirmar_pago(id_venta=id_venta)


@router.get(
    "",
    response_model=list[VentaResponse],
    status_code=status.HTTP_200_OK,
    summary="Listar ventas del cliente autenticado",
)
async def list_ventas(
    current_user: AuthUser,
    service: VentaServiceDep,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> list[VentaResponse]:
    return await service.get_by_cliente(id_cliente=current_user.user_id, limit=limit, offset=offset)


@router.get(
    "/{id_venta}",
    response_model=VentaResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener venta por ID",
)
async def get_venta(
    id_venta: int,
    current_user: AuthUser,
    service: VentaServiceDep,
) -> VentaResponse:
    return await service.get_by_id(id_venta)
