import pytest
from httpx import AsyncClient

class TestProductosAPI:
    @pytest.mark.asyncio
    async def test_list_products_returns_paginated_response(self, client: AsyncClient):
        response = await client.get("/products/")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "page" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_create_product_without_auth_returns_401_or_403(self, client: AsyncClient):
        # multipart/form-data request
        data = {
            "nombre": "Producto Test",
            "precio": "25.5"
        }
        response = await client.post("/products/", data=data)
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_create_product_with_admin_auth_success(self, client: AsyncClient, auth_headers_admin):
        # Usamos auth_headers_admin como admin
        data = {
            "nombre": "Galleta Choco",
            "precio": "5.5",
            "stock_minimo": "10",
            "estado": "True"
        }
        response = await client.post("/products/", data=data, headers=auth_headers_admin)
        
        # Asumiendo que el mock o DB real acepta la creacion
        # Si choca con nombres de test_db_connection, puede dar 409
        if response.status_code == 201:
            res_data = response.json()
            assert res_data["nombre"] == "Galleta Choco"
            assert "slug" in res_data
        elif response.status_code == 409:
            assert "Ya existe un producto activo con ese nombre" in response.text
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")

    @pytest.mark.asyncio
    async def test_delete_product_with_admin_auth(self, client: AsyncClient, auth_headers_admin):
        # Borrar ID inventado, deberia dar 404
        response = await client.delete("/products/9999", headers=auth_headers_admin)
        assert response.status_code == 404
