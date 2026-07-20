import pytest
from unittest.mock import AsyncMock, patch
from httpx import Response
from main import deliveries, _simulate_delivery, _notify_backend

@pytest.mark.asyncio
async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "delivery-service"

@pytest.mark.asyncio
async def test_create_delivery_success(client):
    # Mock de _simulate_delivery para que no corra en segundo plano durante esta prueba
    with patch("main._simulate_delivery", new_callable=AsyncMock) as mock_sim:
        payload = {"id_venta": 42, "n_productos": 3}
        response = await client.post("/deliveries", json=payload)
        
        assert response.status_code == 202
        data = response.json()
        assert data["id_venta"] == 42
        assert data["status"] == "ASIGNADO"
        assert data["eta_seconds"] == 6  # 0 (prep) + 0 (delivery) + 3*2 = 6
        
        # Verificar almacenamiento en memoria
        assert 42 in deliveries
        assert deliveries[42]["status"] == "ASIGNADO"
        mock_sim.assert_called_once_with(42, 3)

@pytest.mark.asyncio
async def test_get_delivery_status(client):
    # Preparar estado previo
    deliveries[99] = {
        "id_venta": 99,
        "status": "EN_RUTA",
        "created_at": "2026-07-20T12:00:00Z",
        "eta_seconds": 15,
        "completed_at": None,
    }
    
    response = await client.get("/deliveries/99")
    assert response.status_code == 200
    data = response.json()
    assert data["id_venta"] == 99
    assert data["status"] == "EN_RUTA"

@pytest.mark.asyncio
async def test_get_delivery_not_found(client):
    response = await client.get("/deliveries/9999")
    assert response.status_code == 404
    assert "no encontrada" in response.json()["detail"]

@pytest.mark.asyncio
async def test_simulate_delivery_flow():
    # Registrar la entrega antes de simular
    deliveries[101] = {
        "id_venta": 101,
        "status": "ASIGNADO",
        "created_at": "2026-07-20T12:00:00Z",
        "eta_seconds": 10,
        "completed_at": None,
    }
    
    # Mockear notify_backend para que no envíe HTTP request real
    with patch("main._notify_backend", new_callable=AsyncMock) as mock_notify:
        await _simulate_delivery(101, 2)
        
        assert deliveries[101]["status"] == "ENTREGADO"
        assert deliveries[101]["completed_at"] is not None
        mock_notify.assert_called_once_with(101)

@pytest.mark.asyncio
async def test_simulate_delivery_exception():
    # Esto provocará una excepción KeyError interna al no existir 9999 en deliveries
    # y probaremos que la capture y ponga estado ERROR si es posible, o al menos
    # no truene la app.
    # Nota: Si el id_venta no está en deliveries, se levantará KeyError en:
    # deliveries[id_venta]["status"] = "RECOGIDO"
    # y caerá en el except Exception as e, que pondrá deliveries[id_venta]["status"] = "ERROR",
    # lo cual también levantará KeyError.
    # Así que se registrará el error y no crasheará la app.
    await _simulate_delivery(9999, 1)

@pytest.mark.asyncio
async def test_notify_backend_success():
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = Response(200)
        
        await _notify_backend(101)
        
        mock_post.assert_called_once()
        headers = mock_post.call_args[1]["headers"]
        assert headers["x-delivery-token"] == "test-webhook-token"

@pytest.mark.asyncio
async def test_notify_backend_retry_then_success():
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        # Falla primero, éxito en la segunda
        mock_post.side_effect = [Response(500), Response(200)]
        
        with patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:
            await _notify_backend(101)
            
            assert mock_post.call_count == 2
            mock_sleep.assert_called_once_with(1)  # 2^0 = 1s de espera
