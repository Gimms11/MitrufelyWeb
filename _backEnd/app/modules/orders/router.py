from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.modules.orders.dependencies import get_venta_service
from app.modules.orders.schemas import VentaRequest, VentaResponse
from app.modules.orders.service import VentaService
from app.security.dependencies import AuthUser

router = APIRouter(prefix="/ventas", tags=["Ventas"])

VentaServiceDep = Annotated[VentaService, Depends(get_venta_service)]

@router.post(
    "/checkout",
    response_model=VentaResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Checkout de Venta",
)
async def checkout(
    payload: VentaRequest,
    current_user: AuthUser,
    service: VentaServiceDep,
) -> VentaResponse:
    """
    Procesa el carrito y genera la orden de venta.
    Implementa expansión automática de paquetes y deducción FEFO de inventario.
    """
    # En un sistema real, mapeariamos el current_user.user_id al id_cliente
    # Asumimos una correspondencia simple para el propósito de este código.
    # Necesitamos consultar 'clientes' si el auth no trae el id_cliente,
    # pero usaremos user_id temporalmente.
    return await service.create_checkout(id_cliente=current_user.user_id, dto=payload)
