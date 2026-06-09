from abc import ABC, abstractmethod
from typing import List, Optional

from app.domain.repositories.base import AbstractRepository
from app.infrastructure.database.models.ventas import Venta


class IVentaRepository(AbstractRepository[Venta, int], ABC):
    @abstractmethod
    async def create_venta_transactional(self, venta: Venta) -> Venta:
        pass

    @abstractmethod
    async def find_by_cliente(
        self, id_cliente: int, *, limit: int = 100, offset: int = 0
    ) -> List[Venta]:
        pass
