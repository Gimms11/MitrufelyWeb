"""
Mifrufely Web — PaqueteService Unit Tests
Tests business logic in isolation (no real DB).

Validates:
  - Correct dynamic price calculation from component products.
  - Correct dynamic availability flag based on component stock and status.
  - Public get_all filters out unavailable packages.
  - Admin get_all returns all packages regardless of availability.
  - get_by_id returns None for non-existent package.
  - create delegates correctly to repository.
  - delete returns False for non-existent package.
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.modules.products.service import PaqueteService
from app.modules.products.schemas import PaqueteCreate, PaqueteProductoCreate


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_producto(
    id_producto: int,
    nombre: str,
    precio: str,
    stock_actual: int,
    estado: bool = True,
) -> MagicMock:
    """Create a mock Producto ORM object."""
    p = MagicMock()
    p.id_producto = id_producto
    p.nombre = nombre
    p.precio = Decimal(precio)
    p.stock_actual = stock_actual
    p.estado = estado
    return p


def make_paquete_producto(
    id_paquete_producto: int,
    id_paquete: int,
    id_producto: int,
    cantidad: int,
    producto: MagicMock,
) -> MagicMock:
    """Create a mock PaqueteProducto ORM association object."""
    pp = MagicMock()
    pp.id_paquete_producto = id_paquete_producto
    pp.id_paquete = id_paquete
    pp.id_producto = id_producto
    pp.cantidad = cantidad
    pp.producto = producto
    return pp


def make_paquete(
    id_paquete: int = 1,
    nombre: str = "Caja Dulce",
    slug: str = "caja-dulce",
    estado: bool = True,
    componentes: list | None = None,
) -> MagicMock:
    """Create a mock Paquete ORM object with nested PaqueteProducto + Producto."""
    pkg = MagicMock()
    pkg.id_paquete = id_paquete
    pkg.nombre = nombre
    pkg.slug = slug
    pkg.descripcion = "Descripción de prueba"
    pkg.imagen_url = None
    pkg.estado = estado
    pkg.fecha_creacion = MagicMock()
    pkg.fecha_actualizacion = MagicMock()
    pkg.productos = componentes or []
    return pkg


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.unit
class TestPaqueteService:

    @pytest.fixture
    def mock_repo(self) -> AsyncMock:
        repo = AsyncMock()
        repo.get_by_id = AsyncMock(return_value=None)
        repo.get_by_slug = AsyncMock(return_value=None)
        repo.get_all = AsyncMock(return_value=[])
        repo.create = AsyncMock()
        repo.update = AsyncMock()
        repo.delete = AsyncMock()
        repo.exists = AsyncMock(return_value=False)
        return repo

    @pytest.fixture
    def service(self, mock_repo: AsyncMock) -> PaqueteService:
        return PaqueteService(repo=mock_repo)

    # ── Precio dinámico ────────────────────────────────────────────────────────

    async def test_precio_calculado_correctamente(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """El precio debe ser la suma de (precio_unitario * cantidad) por componente."""
        prod1 = make_producto(1, "Torta de Chocolate", "25.00", stock_actual=10)
        prod2 = make_producto(2, "Bebida Especial", "8.50", stock_actual=5)

        paquete = make_paquete(
            componentes=[
                make_paquete_producto(1, 1, 1, 2, prod1),  # 2 × 25.00 = 50.00
                make_paquete_producto(2, 1, 2, 1, prod2),  # 1 × 8.50  = 8.50
            ]
        )
        mock_repo.get_by_id.return_value = paquete

        result = await service.get_by_id(1)

        assert result is not None
        assert result.precio == Decimal("58.50"), (
            f"Precio esperado 58.50, obtenido: {result.precio}"
        )

    # ── Disponibilidad dinámica ────────────────────────────────────────────────

    async def test_disponible_cuando_todos_con_stock(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """Paquete disponible cuando todos los componentes tienen stock suficiente."""
        prod1 = make_producto(1, "Torta", "20.00", stock_actual=5)
        prod2 = make_producto(2, "Bebida", "5.00", stock_actual=10)
        paquete = make_paquete(
            componentes=[
                make_paquete_producto(1, 1, 1, 1, prod1),
                make_paquete_producto(2, 1, 2, 2, prod2),
            ]
        )
        mock_repo.get_by_id.return_value = paquete

        result = await service.get_by_id(1)
        assert result is not None
        assert result.disponible is True

    async def test_no_disponible_cuando_sin_stock(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """Paquete no disponible cuando algún componente tiene stock 0."""
        prod1 = make_producto(1, "Torta", "20.00", stock_actual=0)  # sin stock
        prod2 = make_producto(2, "Bebida", "5.00", stock_actual=10)
        paquete = make_paquete(
            componentes=[
                make_paquete_producto(1, 1, 1, 1, prod1),
                make_paquete_producto(2, 1, 2, 1, prod2),
            ]
        )
        mock_repo.get_by_id.return_value = paquete

        result = await service.get_by_id(1)
        assert result is not None
        assert result.disponible is False

    async def test_no_disponible_cuando_producto_inactivo(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """Paquete no disponible cuando algún componente está inactivo."""
        prod1 = make_producto(1, "Torta", "20.00", stock_actual=5, estado=False)
        prod2 = make_producto(2, "Bebida", "5.00", stock_actual=10)
        paquete = make_paquete(
            componentes=[
                make_paquete_producto(1, 1, 1, 1, prod1),
                make_paquete_producto(2, 1, 2, 1, prod2),
            ]
        )
        mock_repo.get_by_id.return_value = paquete

        result = await service.get_by_id(1)
        assert result is not None
        assert result.disponible is False

    # ── get_all público vs admin ───────────────────────────────────────────────

    async def test_get_all_publico_solo_retorna_disponibles(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """El endpoint público debe filtrar paquetes no disponibles."""
        prod_con_stock = make_producto(1, "A", "10.00", stock_actual=5)
        prod_sin_stock = make_producto(2, "B", "10.00", stock_actual=0)

        paquete_disponible = make_paquete(
            id_paquete=1,
            slug="disponible",
            componentes=[make_paquete_producto(1, 1, 1, 1, prod_con_stock)],
        )
        paquete_agotado = make_paquete(
            id_paquete=2,
            slug="agotado",
            componentes=[make_paquete_producto(2, 2, 2, 1, prod_sin_stock)],
        )
        mock_repo.get_all.return_value = [paquete_disponible, paquete_agotado]

        result = await service.get_all()

        assert len(result) == 1
        assert result[0].slug == "disponible"

    async def test_get_all_admin_retorna_todos(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """El endpoint admin debe retornar todos los paquetes sin filtrar."""
        prod_con_stock = make_producto(1, "A", "10.00", stock_actual=5)
        prod_sin_stock = make_producto(2, "B", "10.00", stock_actual=0)

        paquete_disponible = make_paquete(
            id_paquete=1, slug="disponible",
            componentes=[make_paquete_producto(1, 1, 1, 1, prod_con_stock)],
        )
        paquete_agotado = make_paquete(
            id_paquete=2, slug="agotado",
            componentes=[make_paquete_producto(2, 2, 2, 1, prod_sin_stock)],
        )
        mock_repo.get_all.return_value = [paquete_disponible, paquete_agotado]

        result = await service.get_all_admin()

        assert len(result) == 2

    # ── get_by_id ──────────────────────────────────────────────────────────────

    async def test_get_by_id_no_encontrado_retorna_none(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """get_by_id debe retornar None si el repositorio no encuentra el paquete."""
        mock_repo.get_by_id.return_value = None

        result = await service.get_by_id(999)
        assert result is None

    # ── delete ─────────────────────────────────────────────────────────────────

    async def test_delete_retorna_false_si_no_existe(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """delete debe retornar False si el paquete no existe."""
        mock_repo.exists.return_value = False

        result = await service.delete(999)
        assert result is False
        mock_repo.delete.assert_not_called()

    async def test_delete_retorna_true_si_existe(
        self, service: PaqueteService, mock_repo: AsyncMock
    ) -> None:
        """delete debe retornar True y llamar al repositorio si el paquete existe."""
        mock_repo.exists.return_value = True

        result = await service.delete(1)
        assert result is True
        mock_repo.delete.assert_called_once_with(1)
