import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
import os

# Establecer variables de entorno para pruebas antes de importar la app
os.environ["DELIVERY_WEBHOOK_TOKEN"] = "test-webhook-token"
os.environ["BACKEND_URL"] = "http://test-backend"
os.environ["PREPARATION_DELAY_SECONDS"] = "0"
os.environ["DELIVERY_DELAY_SECONDS"] = "0"

from main import app, deliveries

@pytest.fixture(autouse=True)
def clear_deliveries():
    """Limpia el almacén de entregas en memoria antes de cada test."""
    deliveries.clear()
    yield

@pytest_asyncio.fixture
async def client():
    """Cliente HTTP asíncrono para probar la aplicación de delivery."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as ac:
        yield ac
