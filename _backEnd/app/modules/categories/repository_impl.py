from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.catalogo import Categoria, Producto
from app.infrastructure.database.models.cupones import CuponMaestro
from app.modules.categories.repository import ICategoriaRepository


class CategoriaRepositoryImpl(ICategoriaRepository):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_by_id(self, pk: int) -> Categoria | None:
        stmt = select(Categoria).where(Categoria.id_categoria == pk)
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> Categoria | None:
        stmt = select(Categoria).where(Categoria.slug == slug)
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_all(self, *, limit: int = 100, offset: int = 0) -> list[Categoria]:
        stmt = select(Categoria).limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_paginated(
        self,
        *,
        page: int = 1,
        size: int = 20,
        search: str | None = None,
        activo: bool | None = None,
    ) -> tuple[int, list[Categoria]]:
        query = select(Categoria)

        if search:
            query = query.where(Categoria.nombre.ilike(f"%{search}%"))

        if activo is not None:
            query = query.where(Categoria.estado == activo)

        count_stmt = select(func.count()).select_from(query.subquery())
        total_res = await self._session.execute(count_stmt)
        total = total_res.scalar_one()

        offset = (page - 1) * size
        query = query.order_by(Categoria.nombre.asc())
        query = query.offset(offset).limit(size)

        result = await self._session.execute(query)
        items = list(result.scalars().all())

        return total, items

    async def create(self, entity: Categoria) -> Categoria:
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def update(self, entity: Categoria) -> Categoria:
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def delete(self, pk: int) -> None:
        categoria = await self.get_by_id(pk)
        if categoria:
            categoria.estado = False
            await self._session.flush()

    async def exists(self, pk: int) -> bool:
        stmt = select(Categoria.id_categoria).where(Categoria.id_categoria == pk)
        result = await self._session.execute(stmt)
        return result.scalars().first() is not None

    async def find_by_nombre(self, nombre: str, exclude_id: int | None = None) -> Categoria | None:
        stmt = select(Categoria).where(Categoria.nombre == nombre)
        if exclude_id is not None:
            stmt = stmt.where(Categoria.id_categoria != exclude_id)
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def has_productos(self, id_categoria: int) -> bool:
        stmt = select(Producto.id_producto).where(Producto.id_categoria == id_categoria)
        result = await self._session.execute(stmt)
        return result.scalars().first() is not None

    async def has_cupones_maestro(self, id_categoria: int) -> bool:
        stmt = select(CuponMaestro.id_cupon).where(CuponMaestro.id_categoria == id_categoria)
        result = await self._session.execute(stmt)
        return result.scalars().first() is not None

    async def generate_unique_slug(self, nombre: str) -> str:
        base_slug: str = slugify(nombre)
        if not base_slug:
            base_slug = "categoria"

        stmt = select(Categoria.slug).where(Categoria.slug.like(f"{base_slug}%"))
        result = await self._session.execute(stmt)
        existing_slugs: set[str] = {s for s in result.scalars().all() if s}

        if base_slug not in existing_slugs:
            return base_slug

        counter = 2
        while f"{base_slug}-{counter}" in existing_slugs:
            counter += 1
        return f"{base_slug}-{counter}"
