from abc import ABC, abstractmethod
from typing import List, Optional, Tuple

from app.domain.repositories.base import AbstractRepository
from app.infrastructure.database.models.catalogo import Paquete, Producto


class IPaqueteRepository(AbstractRepository[Paquete, int], ABC):
    """
    Contrato para el repositorio de Paquetes Comerciales.
    """

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Optional[Paquete]:
        """Obtiene un paquete por su slug."""
        pass

    @abstractmethod
    async def get_all_active_with_stock_info(self, *, limit: int = 100, offset: int = 0) -> List[Paquete]:
        """Obtiene paquetes activos, calculando su disponibilidad dinámica."""
        pass


class IProductoRepository(AbstractRepository[Producto, int], ABC):
    """
    Contrato para el repositorio de Productos.
    """

    @abstractmethod
    async def get_paginated(
        self,
        *,
        search: Optional[str] = None,
        categoria: Optional[str] = None,
        activo: Optional[bool] = None,
        stock: Optional[str] = None,
        page: int = 1,
        size: int = 20,
        sort: Optional[str] = None
    ) -> Tuple[int, List[Producto]]:
        """Obtiene productos con filtros y paginación (total, items)."""
        pass

    @abstractmethod
    async def get_by_slug(self, slug: str) -> Optional[Producto]:
        """Obtiene un producto por su slug."""
        pass

    @abstractmethod
    async def generate_unique_slug(self, base_nombre: str) -> str:
        """Genera un slug único a partir del nombre."""
        pass

    @abstractmethod
    async def is_nombre_duplicado(self, nombre: str, exclude_id: Optional[int] = None) -> bool:
        """Verifica si existe un producto activo con el mismo nombre."""
        pass
