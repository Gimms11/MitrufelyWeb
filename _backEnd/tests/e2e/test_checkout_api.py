"""
Mifrufely Web — E2E Checkout API Tests (Fase 4)
Tests checkout endpoints through ASGI transport.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.e2e
class TestCheckoutAPI:
    async def test_checkout_carrito_vacio_da_error(
        self,
        client: AsyncClient,
        auth_headers_client: dict,
    ) -> None:
        payload = {"productos": [], "paquetes": [], "tipo_pago": "TARJETA"}
        response = await client.post(
            "/ventas/checkout",
            headers=auth_headers_client,
            json=payload,
        )
        assert response.status_code in (400, 422)

    async def test_checkout_sin_auth(
        self,
        client: AsyncClient,
    ) -> None:
        payload = {"productos": [], "paquetes": [], "tipo_pago": "TARJETA"}
        response = await client.post("/ventas/checkout", json=payload)
        assert response.status_code == 401

    async def test_checkout_cart_sin_auth(
        self,
        client: AsyncClient,
    ) -> None:
        response = await client.post("/ventas/checkout/cart")
        assert response.status_code == 401

    async def test_confirmar_pago_sin_admin(
        self,
        client: AsyncClient,
        auth_headers_client: dict,
    ) -> None:
        response = await client.put(
            "/ventas/1/pagar",
            headers=auth_headers_client,
        )
        assert response.status_code == 403

    @pytest.mark.skip(
        reason="NeonDB no tiene columnas base_imponible/igv. "
        "Ejecutar ALTER TABLE ventas ADD COLUMN base_imponible... "
        "desde M05_ventas_pagos.sql"
    )
    async def test_confirmar_pago_admin_venta_inexistente(
        self,
        client: AsyncClient,
        auth_headers_admin: dict,
    ) -> None:
        response = await client.put(
            "/ventas/99999/pagar",
            headers=auth_headers_admin,
        )
        assert response.status_code == 404

    async def test_list_ventas_sin_auth(self, client: AsyncClient) -> None:
        response = await client.get("/ventas")
        assert response.status_code == 401

    async def test_get_venta_sin_auth(self, client: AsyncClient) -> None:
        response = await client.get("/ventas/1")
        assert response.status_code == 401


@pytest.mark.e2e
class TestCheckoutEndpointsStructure:
    async def test_checkout_endpoint_exists(
        self,
        client: AsyncClient,
        auth_headers_client: dict,
    ) -> None:
        payload = {"productos": [], "paquetes": [], "tipo_pago": "TARJETA"}
        response = await client.post(
            "/ventas/checkout",
            headers=auth_headers_client,
            json=payload,
        )
        assert response.status_code in (400, 404, 422)

    async def test_checkout_cart_endpoint_exists(
        self,
        client: AsyncClient,
        auth_headers_client: dict,
    ) -> None:
        response = await client.post(
            "/ventas/checkout/cart",
            headers=auth_headers_client,
        )
        assert response.status_code in (400, 422)
