"""
Mifrufely Web — CartService Unit Tests (Fase 4)
Tests Redis-backed cart operations in isolation.
"""

from decimal import Decimal
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

from app.modules.cart.schemas import (
    AddCartItemRequest,
    UpdateCartItemRequest,
)
from app.modules.cart.service import CartService


@pytest.fixture
def mock_redis_cart() -> AsyncMock:
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.setex = AsyncMock(return_value=True)
    redis.delete = AsyncMock(return_value=1)
    return redis


@pytest.fixture
def cart_service(mock_redis_cart: AsyncMock) -> CartService:
    return CartService(redis=mock_redis_cart)


@pytest.mark.unit
class TestCartServiceGetCart:
    async def test_carrito_vacio_retorna_default(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        mock_redis_cart.get.return_value = None

        result = await cart_service.get_cart(user_id=1)

        assert result.items == []
        assert result.total_items == 0
        assert result.subtotal == Decimal("0.00")
        assert result.updated_at is None

    async def test_carrito_con_items_deserializa_correctamente(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        import json

        mock_redis_cart.get.return_value = json.dumps(
            {
                "items": [
                    {
                        "id_producto": 1,
                        "nombre": "Torta",
                        "cantidad": 2,
                        "precio_unitario": "15.50",
                        "imagen_url": None,
                        "es_paquete": False,
                        "id_paquete": None,
                    },
                ],
                "updated_at": "2026-06-09T15:00:00+00:00",
            }
        )

        result = await cart_service.get_cart(user_id=1)

        assert result.total_items == 2
        assert result.subtotal == Decimal("31.00")
        assert len(result.items) == 1
        assert result.items[0].nombre == "Torta"
        assert result.items[0].precio_unitario == Decimal("15.50")
        assert result.updated_at is not None

    async def test_json_corrupto_limpia_carrito(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        mock_redis_cart.get.return_value = "esto no es json {{"

        result = await cart_service.get_cart(user_id=1)

        assert result.items == []
        assert result.total_items == 0
        mock_redis_cart.delete.assert_called()


@pytest.mark.unit
class TestCartServiceAddItem:
    async def test_agregar_item_a_carrito_vacio(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        mock_redis_cart.get.return_value = None

        result = await cart_service.add_item(
            user_id=1,
            nombre="Torta de Chocolate",
            precio_unitario=Decimal("25.00"),
            item=AddCartItemRequest(id_producto=1, cantidad=2),
        )

        assert result.total_items == 2
        assert result.subtotal == Decimal("50.00")
        assert len(result.items) == 1
        assert result.items[0].nombre == "Torta de Chocolate"
        mock_redis_cart.setex.assert_called_once()

    async def test_agregar_item_existente_acumula_cantidad(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        import json

        mock_redis_cart.get.return_value = json.dumps(
            {
                "items": [
                    {
                        "id_producto": 1,
                        "nombre": "Torta",
                        "cantidad": 1,
                        "precio_unitario": "10.00",
                        "imagen_url": None,
                        "es_paquete": False,
                        "id_paquete": None,
                    },
                ],
                "updated_at": None,
            }
        )

        result = await cart_service.add_item(
            user_id=1,
            nombre="Torta",
            precio_unitario=Decimal("10.00"),
            item=AddCartItemRequest(id_producto=1, cantidad=3),
        )

        assert result.total_items == 4
        assert result.items[0].cantidad == 4

    async def test_agregar_paquete_con_id_paquete(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        mock_redis_cart.get.return_value = None

        result = await cart_service.add_item(
            user_id=1,
            nombre="Pack Degustación",
            precio_unitario=Decimal("45.00"),
            item=AddCartItemRequest(
                id_producto=999,
                cantidad=1,
                es_paquete=True,
                id_paquete=5,
            ),
            imagen_url="https://img.com/pack.jpg",
        )

        assert result.total_items == 1
        assert result.items[0].es_paquete is True
        assert result.items[0].id_paquete == 5
        mock_redis_cart.setex.assert_called_once()


@pytest.mark.unit
class TestCartServiceUpdateItem:
    async def test_actualizar_cantidad_existente(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        import json

        mock_redis_cart.get.return_value = json.dumps(
            {
                "items": [
                    {
                        "id_producto": 1,
                        "nombre": "Torta",
                        "cantidad": 2,
                        "precio_unitario": "10.00",
                        "imagen_url": None,
                        "es_paquete": False,
                        "id_paquete": None,
                    },
                ],
                "updated_at": None,
            }
        )

        result = await cart_service.update_item(
            user_id=1,
            id_producto=1,
            payload=UpdateCartItemRequest(cantidad=5),
        )

        assert result.items[0].cantidad == 5
        assert result.total_items == 5

    async def test_actualizar_item_inexistente_lanza_error(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        mock_redis_cart.get.return_value = None

        with pytest.raises(ValueError) as exc_info:
            await cart_service.update_item(
                user_id=1,
                id_producto=999,
                payload=UpdateCartItemRequest(cantidad=1),
            )
        assert "no está en el carrito" in str(exc_info.value)


@pytest.mark.unit
class TestCartServiceRemoveItem:
    async def test_eliminar_item_existente(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        import json

        mock_redis_cart.get.return_value = json.dumps(
            {
                "items": [
                    {
                        "id_producto": 1,
                        "nombre": "A",
                        "cantidad": 2,
                        "precio_unitario": "10.00",
                        "imagen_url": None,
                        "es_paquete": False,
                        "id_paquete": None,
                    },
                    {
                        "id_producto": 2,
                        "nombre": "B",
                        "cantidad": 1,
                        "precio_unitario": "20.00",
                        "imagen_url": None,
                        "es_paquete": False,
                        "id_paquete": None,
                    },
                ],
                "updated_at": None,
            }
        )

        result = await cart_service.remove_item(user_id=1, id_producto=1)

        assert len(result.items) == 1
        assert result.items[0].id_producto == 2
        assert result.total_items == 1
        assert result.subtotal == Decimal("20.00")

    async def test_eliminar_item_inexistente_es_noop(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        mock_redis_cart.get.return_value = None

        result = await cart_service.remove_item(user_id=1, id_producto=999)

        assert result.items == []
        assert result.total_items == 0


@pytest.mark.unit
class TestCartServiceClearCart:
    async def test_clear_cart_elimina_key(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        await cart_service.clear_cart(user_id=1)

        mock_redis_cart.delete.assert_called_once()


@pytest.mark.unit
class TestCartServiceTTL:
    async def test_persist_usa_setex_con_ttl_7_dias(
        self,
        cart_service: CartService,
        mock_redis_cart: AsyncMock,
    ) -> None:
        mock_redis_cart.get.return_value = None

        await cart_service.add_item(
            user_id=1,
            nombre="Producto",
            precio_unitario=Decimal("10.00"),
            item=AddCartItemRequest(id_producto=1, cantidad=1),
        )

        call_args = mock_redis_cart.setex.call_args
        assert call_args is not None
        key, ttl, value = call_args[0]
        assert key == "cart:1"
        assert ttl == 604800
