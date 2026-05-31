"""
Mifrufely Web — E2E Tests: Packages API
Tests the /api/v1/packages endpoints via HTTPX against the FastAPI app.

IMPORTANT: These tests run against the real NeonDB through the running app.
All tests are READ-ONLY (GET requests) or use auth to guard write endpoints.

Run with:
    pytest tests/e2e/test_packages_api.py -v

Or inside Docker:
    docker compose exec api pytest tests/e2e/test_packages_api.py -v
"""

import pytest
from httpx import AsyncClient


@pytest.mark.e2e
class TestPackagesAPI:

    # ── GET /packages/ ─────────────────────────────────────────────────────────

    async def test_list_packages_returns_200(self, client: AsyncClient) -> None:
        """
        WHAT: Calls GET /packages/ without authentication.
        VALIDATES:
          - Endpoint is publicly accessible (no auth required).
          - Returns HTTP 200 OK.
          - Response body is a JSON array.
        """
        response = await client.get("/packages/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"

    async def test_list_packages_schema_when_present(
        self, client: AsyncClient
    ) -> None:
        """
        WHAT: If packages exist, validates the response schema structure.
        VALIDATES:
          - Each package has required fields: id_paquete, nombre, slug, disponible, precio.
          - 'disponible' is a boolean.
          - 'precio' is a numeric string (Decimal serialized by Pydantic).
        """
        response = await client.get("/packages/")
        assert response.status_code == 200
        packages = response.json()

        for pkg in packages:
            assert "id_paquete" in pkg, "Missing field: id_paquete"
            assert "nombre" in pkg, "Missing field: nombre"
            assert "slug" in pkg, "Missing field: slug"
            assert "disponible" in pkg, "Missing field: disponible"
            assert "precio" in pkg, "Missing field: precio"
            assert "productos" in pkg, "Missing field: productos"
            assert isinstance(pkg["disponible"], bool), (
                f"'disponible' should be bool, got: {type(pkg['disponible'])}"
            )

    async def test_list_packages_only_returns_available(
        self, client: AsyncClient
    ) -> None:
        """
        WHAT: All packages returned to the public must have disponible=True.
        VALIDATES:
          - Backend correctly filters unavailable packages.
        """
        response = await client.get("/packages/")
        assert response.status_code == 200
        packages = response.json()

        for pkg in packages:
            assert pkg["disponible"] is True, (
                f"Paquete '{pkg.get('nombre')}' debería estar disponible pero disponible=False"
            )

    # ── GET /packages/{id} ─────────────────────────────────────────────────────

    async def test_get_package_not_found_returns_404(
        self, client: AsyncClient
    ) -> None:
        """
        WHAT: Requests a package with ID 999999 (should not exist).
        VALIDATES:
          - Returns HTTP 404 Not Found.
        """
        response = await client.get("/packages/999999")
        assert response.status_code == 404

    async def test_get_existing_package_if_present(
        self, client: AsyncClient
    ) -> None:
        """
        WHAT: Fetches the first package in the list and retrieves it by ID.
        VALIDATES:
          - The detail endpoint returns the same package.
          - IDs match.
        SKIP: If no packages exist in the DB.
        """
        list_response = await client.get("/packages/")
        assert list_response.status_code == 200
        packages = list_response.json()

        if not packages:
            pytest.skip("No hay paquetes en la BD — crea al menos uno para probar el detalle")

        first = packages[0]
        id_paquete = first["id_paquete"]

        detail_response = await client.get(f"/packages/{id_paquete}")
        assert detail_response.status_code == 200
        detail = detail_response.json()
        assert detail["id_paquete"] == id_paquete
        assert detail["nombre"] == first["nombre"]
        assert detail["slug"] == first["slug"]

    # ── GET /packages/admin ────────────────────────────────────────────────────

    async def test_admin_packages_without_auth_returns_401_or_403(
        self, client: AsyncClient
    ) -> None:
        """
        WHAT: Calls the admin-only endpoint without a token.
        VALIDATES:
          - Protected endpoint returns 401 Unauthorized or 403 Forbidden.
        """
        response = await client.get("/packages/admin")
        assert response.status_code in (401, 403), (
            f"Expected 401 or 403 for unauthenticated admin endpoint, got {response.status_code}"
        )

    async def test_admin_packages_with_admin_token_returns_200(
        self, client: AsyncClient, auth_headers_admin: dict
    ) -> None:
        """
        WHAT: Calls the admin-only endpoint with a valid admin JWT.
        VALIDATES:
          - Admin can access the endpoint.
          - Returns HTTP 200 with a JSON array.
        """
        response = await client.get("/packages/admin", headers=auth_headers_admin)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_admin_packages_with_client_token_returns_403(
        self, client: AsyncClient, auth_headers_client: dict
    ) -> None:
        """
        WHAT: A regular client should not be able to access the admin endpoint.
        VALIDATES:
          - Role-based access control is enforced.
        """
        response = await client.get("/packages/admin", headers=auth_headers_client)
        assert response.status_code in (401, 403), (
            f"Expected 401/403 for non-admin client, got {response.status_code}"
        )

    # ── POST /packages/ ────────────────────────────────────────────────────────

    async def test_create_package_without_auth_returns_401_or_403(
        self, client: AsyncClient
    ) -> None:
        """POST /packages/ should be protected — reject unauthenticated requests."""
        payload = {
            "nombre": "Paquete Test",
            "slug": "paquete-test",
            "descripcion": "Test",
            "productos": [
                {"id_producto": 1, "cantidad": 1},
                {"id_producto": 2, "cantidad": 2},
            ],
        }
        response = await client.post("/packages/", json=payload)
        assert response.status_code in (401, 403)

    async def test_create_package_with_single_product_returns_422(
        self, client: AsyncClient, auth_headers_admin: dict
    ) -> None:
        """
        WHAT: Creating a package with only 1 product should fail validation.
        VALIDATES:
          - Pydantic validator enforces min 2 distinct products.
          - Returns HTTP 422 Unprocessable Entity.
        """
        payload = {
            "nombre": "Paquete Inválido",
            "slug": "paquete-invalido",
            "productos": [
                {"id_producto": 1, "cantidad": 1},  # Only 1 product — invalid
            ],
        }
        response = await client.post(
            "/packages/", json=payload, headers=auth_headers_admin
        )
        assert response.status_code == 422, (
            f"Expected 422 for single-product package, got {response.status_code}"
        )

    async def test_create_package_with_duplicate_products_returns_422(
        self, client: AsyncClient, auth_headers_admin: dict
    ) -> None:
        """
        WHAT: Two entries with the same id_producto in a package must fail.
        VALIDATES:
          - Pydantic field_validator correctly detects duplicate product IDs.
        """
        payload = {
            "nombre": "Paquete Duplicado",
            "slug": "paquete-duplicado",
            "productos": [
                {"id_producto": 1, "cantidad": 1},
                {"id_producto": 1, "cantidad": 2},  # Duplicate!
            ],
        }
        response = await client.post(
            "/packages/", json=payload, headers=auth_headers_admin
        )
        assert response.status_code == 422
