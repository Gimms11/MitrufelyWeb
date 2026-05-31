from typing import List, Optional, Tuple
import re

from sqlalchemy import select, func, desc, asc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.infrastructure.database.models.catalogo import Paquete, PaqueteProducto, Producto, Categoria
from app.modules.products.repository import IPaqueteRepository, IProductoRepository


class PaqueteRepositoryImpl(IPaqueteRepository):
    """Implementación SQLAlchemy del repositorio de Paquetes."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_by_id(self, pk: int) -> Optional[Paquete]:
        stmt = (
            select(Paquete)
            .options(
                selectinload(Paquete.productos)
                .selectinload(PaqueteProducto.producto)
            )
            .where(Paquete.id_paquete == pk, Paquete.estado == True)
        )
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> Optional[Paquete]:
        stmt = (
            select(Paquete)
            .options(
                selectinload(Paquete.productos)
                .selectinload(PaqueteProducto.producto)
            )
            .where(Paquete.slug == slug, Paquete.estado == True)
        )
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_all(self, *, limit: int = 100, offset: int = 0) -> List[Paquete]:
        stmt = (
            select(Paquete)
            .options(
                selectinload(Paquete.productos)
                .selectinload(PaqueteProducto.producto)
            )
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_active_with_stock_info(self, *, limit: int = 100, offset: int = 0) -> List[Paquete]:
        # El cálculo de disponibilidad dinámica se hará a nivel de servicio para no complicar la BD.
        # Solo retornamos los paquetes activos.
        return await self.get_all(limit=limit, offset=offset)

    async def create(self, entity: Paquete) -> Paquete:
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def update(self, entity: Paquete) -> Paquete:
        # En SQLAlchemy el entity ya está atachado y manejado, pero podemos hacer un flush
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def delete(self, pk: int) -> None:
        paquete = await self.get_by_id(pk)
        if paquete:
            # Soft delete
            paquete.estado = False
            await self._session.flush()

    async def exists(self, pk: int) -> bool:
        stmt = select(Paquete.id_paquete).where(Paquete.id_paquete == pk, Paquete.estado == True)
        result = await self._session.execute(stmt)
        return result.scalars().first() is not None


class ProductoRepositoryImpl(IProductoRepository):
    """Implementación SQLAlchemy del repositorio de Productos."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def get_by_id(self, pk: int) -> Optional[Producto]:
        stmt = (
            select(Producto)
            .options(selectinload(Producto.categoria))
            .where(Producto.id_producto == pk)
        )
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_by_slug(self, slug: str) -> Optional[Producto]:
        stmt = (
            select(Producto)
            .options(selectinload(Producto.categoria))
            .where(Producto.slug == slug)
        )
        result = await self._session.execute(stmt)
        return result.scalars().first()

    async def get_all(self, *, limit: int = 100, offset: int = 0) -> List[Producto]:
        stmt = (
            select(Producto)
            .options(selectinload(Producto.categoria))
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

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
        
        query = select(Producto).options(selectinload(Producto.categoria))
        
        # Filtros
        if search:
            query = query.where(Producto.nombre.ilike(f"%{search}%"))
            
        if categoria:
            query = query.join(Categoria, isouter=True).where(Categoria.nombre.ilike(f"%{categoria}%"))
            
        if activo is not None:
            query = query.where(Producto.estado == activo)
            
        if stock == 'available':
            query = query.where(Producto.stock_actual > 0)
        elif stock == 'out_of_stock':
            query = query.where(Producto.stock_actual <= 0)

        # Total count
        count_stmt = select(func.count()).select_from(query.subquery())
        total_res = await self._session.execute(count_stmt)
        total = total_res.scalar_one()

        # Sort
        if sort:
            if sort.startswith("-"):
                query = query.order_by(desc(getattr(Producto, sort[1:])))
            else:
                query = query.order_by(asc(getattr(Producto, sort)))
        else:
            query = query.order_by(Producto.id_producto.desc())

        # Pagination
        offset = (page - 1) * size
        query = query.offset(offset).limit(size)

        result = await self._session.execute(query)
        items = list(result.scalars().all())

        return total, items

    async def create(self, entity: Producto) -> Producto:
        self._session.add(entity)
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def update(self, entity: Producto) -> Producto:
        await self._session.flush()
        await self._session.refresh(entity)
        return entity

    async def delete(self, pk: int) -> None:
        producto = await self.get_by_id(pk)
        if producto:
            producto.estado = False
            await self._session.flush()

    async def exists(self, pk: int) -> bool:
        stmt = select(Producto.id_producto).where(Producto.id_producto == pk)
        result = await self._session.execute(stmt)
        return result.scalars().first() is not None

    async def is_nombre_duplicado(self, nombre: str, exclude_id: Optional[int] = None) -> bool:
        stmt = select(Producto.id_producto).where(
            Producto.nombre == nombre, 
            Producto.estado == True
        )
        if exclude_id is not None:
            stmt = stmt.where(Producto.id_producto != exclude_id)
            
        result = await self._session.execute(stmt)
        return result.scalars().first() is not None

    async def generate_unique_slug(self, base_nombre: str) -> str:
        # Simplistic slugify
        base_slug = re.sub(r'[^a-z0-9]+', '-', base_nombre.lower()).strip('-')
        if not base_slug:
            base_slug = "producto"
            
        stmt = select(Producto.slug).where(Producto.slug.like(f"{base_slug}%"))
        result = await self._session.execute(stmt)
        existing_slugs = set(result.scalars().all())
        
        if base_slug not in existing_slugs:
            return base_slug
            
        counter = 2
        while f"{base_slug}-{counter}" in existing_slugs:
            counter += 1
            
        return f"{base_slug}-{counter}"
