from abc import ABC, abstractmethod
from typing import Optional

from app.domain.repositories.base import AbstractRepository
from app.infrastructure.database.models.ventas import Venta


class IVentaRepository(AbstractRepository[Venta, int], ABC):
    """
    Contrato para el repositorio de Ventas.
    """

    @abstractmethod
    async def create_venta_transactional(self, venta: Venta) -> Venta:
        """
        Crea una venta de forma transaccional, insertando sus detalles, 
        metodos de pago y guardando la relación con los paquetes.
        """
        pass
