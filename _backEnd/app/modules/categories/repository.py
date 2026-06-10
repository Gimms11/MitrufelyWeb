from abc import ABC, abstractmethod

from app.domain.repositories.base import AbstractRepository
from app.infrastructure.database.models.catalogo import Categoria


class ICategoriaRepository(AbstractRepository[Categoria, int], ABC):
    @abstractmethod
    async def get_by_slug(self, slug: str) -> Categoria | None:
        pass

    @abstractmethod
    async def get_paginated(
        self,
        *,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        activo: bool | None = None,
    ) -> tuple[int, list[Categoria]]:
        pass

    @abstractmethod
    async def find_by_nombre(
        self, nombre: str, exclude_id: int | None = None
    ) -> Categoria | None:
        pass

    @abstractmethod
    async def has_productos(self, id_categoria: int) -> bool:
        pass

    @abstractmethod
    async def has_cupones_maestro(self, id_categoria: int) -> bool:
        pass

    @abstractmethod
    async def generate_unique_slug(self, nombre: str) -> str:
        pass
