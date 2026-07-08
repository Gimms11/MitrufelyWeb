"""
Mitrufely Web — Users Service
Reporte de Gestión de Usuarios (Fase 7).

Implementa la lectura consolidada de usuarios (con rol, cliente, datos fiscales,
métricas de actividad) y la gestión administrativa de estado de cuentas.
"""

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BusinessRuleError, NotFoundError
from app.infrastructure.database.models.catalogo import MovimientoStock
from app.infrastructure.database.models.usuarios import (
    Cliente,
    DatosFiscales,
    LogSistema,
    Rol,
    Usuario,
)
from app.infrastructure.database.models.ventas import Venta
from app.modules.users.schemas import (
    UserDetailResponse,
    UserEstadoUpdateRequest,
    UserListItemResponse,
)

logger = structlog.get_logger(__name__)


class UsersService:
    """Servicio de gestión y reporte de usuarios."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── Lectura ───────────────────────────────────────────────────────────────

    async def list_users(
        self,
        *,
        rol: str | None = None,
        estado: bool | None = None,
        search: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[UserListItemResponse]:
        """
        Lista usuarios para el Reporte de Gestión de Usuarios.

        - Une `usuarios` con `roles` y opcionalmente `clientes`.
        - Calcula `total_ventas` (clientes) y `ultima_actividad` (logs_sistema).
        - Soporta filtros por rol, estado y búsqueda parcial (nombre/email).
        """
        logger.info(
            "users.list.requested",
            rol=rol,
            estado=estado,
            search=search,
            limit=limit,
            offset=offset,
        )

        # Subquery: total de ventas por cliente.
        ventas_subq = (
            select(Venta.id_cliente, func.count(Venta.id_venta).label("total_ventas"))
            .group_by(Venta.id_cliente)
            .subquery()
        )

        # Subquery: última fecha de actividad por usuario (logs_sistema).
        actividad_subq = (
            select(
                LogSistema.id_usuario,
                func.max(LogSistema.fecha).label("ultima_actividad"),
            )
            .group_by(LogSistema.id_usuario)
            .subquery()
        )

        stmt = (
            select(
                Usuario,
                Rol,
                Cliente,
                ventas_subq.c.total_ventas,
                actividad_subq.c.ultima_actividad,
            )
            .join(Rol, Usuario.id_rol == Rol.id_rol)
            .outerjoin(Cliente, Cliente.id_usuario == Usuario.id_usuario)
            .outerjoin(ventas_subq, ventas_subq.c.id_cliente == Cliente.id_cliente)
            .outerjoin(actividad_subq, actividad_subq.c.id_usuario == Usuario.id_usuario)
            .options(selectinload(Usuario.datos_fiscales))
        )

        # Filtros dinámicos
        if rol is not None and rol.strip():
            stmt = stmt.where(Rol.nombre == rol.strip().upper())
        if estado is not None:
            stmt = stmt.where(Usuario.estado == estado)
        if search is not None and search.strip():
            like = f"%{search.strip()}%"
            stmt = stmt.where(
                (Usuario.nombres.ilike(like))
                | (Usuario.apellidos.ilike(like))
                | (Usuario.email.ilike(like))
            )

        stmt = stmt.order_by(Usuario.id_usuario.asc()).limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        rows = result.all()

        items: list[UserListItemResponse] = []
        for usuario, rol_obj, cliente, total_ventas, ultima_actividad in rows:
            cliente_resp = None
            if cliente is not None:
                cliente_resp = {
                    "id_cliente": cliente.id_cliente,
                    "direccion": cliente.direccion,
                    "telefono": cliente.telefono,
                }
            items.append(
                UserListItemResponse(
                    id_usuario=usuario.id_usuario,
                    nombres=usuario.nombres,
                    apellidos=usuario.apellidos,
                    email=usuario.email,
                    telefono=usuario.telefono,
                    estado=usuario.estado,
                    auth_provider=usuario.auth_provider,
                    rol={"id_rol": rol_obj.id_rol, "nombre": rol_obj.nombre.value},
                    cliente=cliente_resp,
                    total_ventas=int(total_ventas or 0),
                    ultima_actividad=ultima_actividad,
                )
            )

        logger.info("users.list.returned", count=len(items))
        return items

    async def get_user_detail(self, id_usuario: int) -> UserDetailResponse:
        """Detalle de un usuario concreto (incluye datos fiscales)."""
        # Reutiliza list_users con filtro id (sencillo y consistente).
        # Implementación dedicada para garantizar datos fiscales.
        stmt = (
            select(Usuario)
            .options(
                selectinload(Usuario.rol),
                selectinload(Usuario.cliente),
                selectinload(Usuario.datos_fiscales),
            )
            .where(Usuario.id_usuario == id_usuario)
        )
        result = await self.session.execute(stmt)
        usuario = result.scalar_one_or_none()
        if usuario is None:
            raise NotFoundError(f"Usuario {id_usuario} no encontrado.")

        # Métricas de actividad
        ventas_count_stmt = (
            select(func.count(Venta.id_venta))
            .join(Cliente, Cliente.id_cliente == Venta.id_cliente)
            .where(Cliente.id_usuario == id_usuario)
        )
        total_ventas = (await self.session.execute(ventas_count_stmt)).scalar_one()

        actividad_stmt = select(func.max(LogSistema.fecha)).where(
            LogSistema.id_usuario == id_usuario
        )
        ultima = (await self.session.execute(actividad_stmt)).scalar_one_or_none()

        # Datos fiscales predeterminados (si existen)
        doc_fiscal = None
        tipo_fiscal = None
        razon = None
        for df in usuario.datos_fiscales or []:
            doc_fiscal = df.numero_documento
            tipo_fiscal = df.tipo_documento.value if df.tipo_documento else None
            razon = df.razon_social
            if df.es_predeterminado:
                break

        cliente_resp = None
        if usuario.cliente is not None:
            cliente_resp = {
                "id_cliente": usuario.cliente.id_cliente,
                "direccion": usuario.cliente.direccion,
                "telefono": usuario.cliente.telefono,
            }

        return UserDetailResponse(
            id_usuario=usuario.id_usuario,
            nombres=usuario.nombres,
            apellidos=usuario.apellidos,
            email=usuario.email,
            telefono=usuario.telefono,
            estado=usuario.estado,
            auth_provider=usuario.auth_provider,
            rol={"id_rol": usuario.rol.id_rol, "nombre": usuario.rol.nombre.value},
            cliente=cliente_resp,
            total_ventas=int(total_ventas or 0),
            ultima_actividad=ultima,
            documento_fiscal=doc_fiscal,
            tipo_documento_fiscal=tipo_fiscal,
            razon_social=razon,
        )

    # ── Escritura ─────────────────────────────────────────────────────────────

    async def update_user_estado(
        self, id_usuario: int, payload: UserEstadoUpdateRequest
    ) -> UserListItemResponse:
        """Activa o desactiva la cuenta de un usuario (no elimina)."""
        if id_usuario <= 0:
            raise BusinessRuleError("ID de usuario inválido.")

        stmt = (
            select(Usuario)
            .options(selectinload(Usuario.rol), selectinload(Usuario.cliente))
            .where(Usuario.id_usuario == id_usuario)
        )
        result = await self.session.execute(stmt)
        usuario = result.scalar_one_or_none()
        if usuario is None:
            raise NotFoundError(f"Usuario {id_usuario} no encontrado.")

        usuario.estado = payload.estado
        await self.session.flush()
        await self.session.refresh(usuario)

        logger.info(
            "users.estado.updated",
            id_usuario=id_usuario,
            estado=payload.estado,
        )

        cliente_resp = None
        if usuario.cliente is not None:
            cliente_resp = {
                "id_cliente": usuario.cliente.id_cliente,
                "direccion": usuario.cliente.direccion,
                "telefono": usuario.cliente.telefono,
            }

        return UserListItemResponse(
            id_usuario=usuario.id_usuario,
            nombres=usuario.nombres,
            apellidos=usuario.apellidos,
            email=usuario.email,
            telefono=usuario.telefono,
            estado=usuario.estado,
            auth_provider=usuario.auth_provider,
            rol={"id_rol": usuario.rol.id_rol, "nombre": usuario.rol.nombre.value},
            cliente=cliente_resp,
            total_ventas=0,
            ultima_actividad=None,
        )
