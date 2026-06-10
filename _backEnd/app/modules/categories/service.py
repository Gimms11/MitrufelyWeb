
from app.core.exceptions import (
    BusinessRuleError,
    ConflictError,
    NotFoundError,
)
from app.domain.services.base import AbstractService
from app.infrastructure.database.models.catalogo import Categoria
from app.modules.categories.repository import ICategoriaRepository
from app.modules.categories.schemas import (
    CategoriaCreate,
    CategoriaResponse,
    CategoriaUpdate,
    PaginatedResponse,
)


class CategoriaService(AbstractService[CategoriaResponse, CategoriaCreate, CategoriaUpdate, int]):
    def __init__(self, repo: ICategoriaRepository) -> None:
        self._repo = repo

    def _map_to_response(self, categoria: Categoria) -> CategoriaResponse:
        return CategoriaResponse(
            id_categoria=categoria.id_categoria,
            nombre=categoria.nombre,
            slug=categoria.slug,
            descripcion=categoria.descripcion,
            estado=categoria.estado,
        )

    async def get_by_id(self, pk: int) -> CategoriaResponse:
        categoria = await self._repo.get_by_id(pk)
        if not categoria:
            raise NotFoundError(f"Categoría {pk} no encontrada")
        return self._map_to_response(categoria)

    async def get_by_slug(self, slug: str) -> CategoriaResponse:
        categoria = await self._repo.get_by_slug(slug)
        if not categoria:
            raise NotFoundError(f"Categoría con slug '{slug}' no encontrada")
        return self._map_to_response(categoria)

    async def get_all(
        self,
        *,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> PaginatedResponse[CategoriaResponse]:
        total, items = await self._repo.get_paginated(
            page=page,
            size=size,
            search=search,
            activo=True,
        )
        pages = (total + size - 1) // size
        return PaginatedResponse[CategoriaResponse](
            items=[self._map_to_response(c) for c in items],
            page=page,
            size=size,
            total=total,
            pages=pages,
        )

    async def get_all_admin(
        self,
        *,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
    ) -> PaginatedResponse[CategoriaResponse]:
        total, items = await self._repo.get_paginated(
            page=page,
            size=size,
            search=search,
            activo=None,
        )
        pages = (total + size - 1) // size
        return PaginatedResponse[CategoriaResponse](
            items=[self._map_to_response(c) for c in items],
            page=page,
            size=size,
            total=total,
            pages=pages,
        )

    async def create(self, dto: CategoriaCreate) -> CategoriaResponse:
        existing = await self._repo.find_by_nombre(dto.nombre)
        if existing:
            raise ConflictError(f"Ya existe una categoría con el nombre '{dto.nombre}'")

        slug = await self._repo.generate_unique_slug(dto.nombre)
        nueva = Categoria(
            nombre=dto.nombre,
            slug=slug,
            descripcion=dto.descripcion,
            estado=dto.estado,
        )
        creada = await self._repo.create(nueva)
        return self._map_to_response(creada)

    async def update(self, pk: int, dto: CategoriaUpdate) -> CategoriaResponse:
        categoria = await self._repo.get_by_id(pk)
        if not categoria:
            raise NotFoundError(f"Categoría {pk} no encontrada")

        if dto.nombre is not None:
            existing = await self._repo.find_by_nombre(dto.nombre, exclude_id=pk)
            if existing:
                raise ConflictError(f"Ya existe una categoría con el nombre '{dto.nombre}'")
            categoria.nombre = dto.nombre
            categoria.slug = await self._repo.generate_unique_slug(dto.nombre)

        if dto.descripcion is not None:
            categoria.descripcion = dto.descripcion
        if dto.estado is not None:
            categoria.estado = dto.estado

        actualizada = await self._repo.update(categoria)
        return self._map_to_response(actualizada)

    async def delete(self, pk: int) -> None:
        categoria = await self._repo.get_by_id(pk)
        if not categoria:
            raise NotFoundError(f"Categoría {pk} no encontrada")

        if await self._repo.has_productos(pk):
            raise BusinessRuleError(
                f"No se puede eliminar la categoría '{categoria.nombre}': "
                "existen productos asociados a ella."
            )
        if await self._repo.has_cupones_maestro(pk):
            raise BusinessRuleError(
                f"No se puede eliminar la categoría '{categoria.nombre}': "
                "existen cupones asociados a ella."
            )

        await self._repo.delete(pk)
