# 🔧 Informe de Cambios y Nuevas Pruebas Implementadas

Este documento detalla las configuraciones de entorno, los archivos creados y las pruebas automatizadas implementadas para resolver los vacíos de testing en el Frontend y el Microservicio de Delivery del proyecto **MitrufelyWeb**.

---

## 1. Cambios de Infraestructura y Configuración de Dependencias

### A. Configuración de Vitest + React Testing Library en `_frontEnd`
1.  **Edición en [`package.json`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/package.json):**
    *   Se agregaron scripts para el test runner: `"test": "vitest"` y `"test:run": "vitest run"`.
    *   Se instalaron como dependencias de desarrollo: `vitest` (test runner), `jsdom` (simulador de entorno de navegador), `@testing-library/react` (métodos de renderizado e interacción de React) y `@testing-library/jest-dom` (aserciones personalizadas sobre el DOM).
2.  **Edición en [`vite.config.ts`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/vite.config.ts):**
    *   Se incluyó la referencia de tipos de Vitest (`/// <reference types="vitest" />`).
    *   Se inyectó el bloque `test` definiendo `environment: 'jsdom'` y declarando como setup de pruebas el archivo `src/test/setup.ts`.
3.  **Creación de [`src/test/setup.ts`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/src/test/setup.ts):**
    *   Configura la limpieza automática de los componentes del DOM virtual después de cada test (`afterEach(cleanup)`).

### B. Configuración de pytest en `_deliveryService`
1.  **Edición en [`requirements.txt`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_deliveryService/requirements.txt):**
    *   Se añadieron las dependencias de test: `pytest`, `pytest-asyncio` y `pytest-mock`.
2.  **Creación de [`tests/conftest.py`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_deliveryService/tests/conftest.py):**
    *   Pre-configura variables de entorno para pruebas (`PREPARATION_DELAY_SECONDS=0` y `DELIVERY_DELAY_SECONDS=0`) para evitar demoras por `asyncio.sleep` reales en los tests de simulación de entregas.
    *   Instancia un fixture de cliente HTTP asíncrono (`httpx.AsyncClient`).

---

## 2. Detalle de los Tests Implementados

### A. Pruebas de Frontend (`_frontEnd/src/test/`)
Se escribieron e implementaron las siguientes pruebas:

1.  **[`Button.test.tsx`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/src/test/Button.test.tsx):**
    *   Renderiza el botón primitivo `Button.tsx`.
    *   Valida la correcta inyección de variantes CSS (`bg-[#5c0f1b]` para primary y `bg-[#ff7a45]` para accent).
    *   Comprueba los estados interactivos como desactivado (`disabled`) y el comportamiento del click a través de `fireEvent.click`.
2.  **[`auth.store.test.ts`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/src/test/auth.store.test.ts):**
    *   Prueba el store de Zustand `useAuthStore` de forma aislada.
    *   Valida la inicialización de sesión vacía, el login (`setUser`), la limpieza del almacenamiento en logout y la actualización de perfil (`updateUser`).
    *   *Corrección crítica:* Se tipó el objeto ficticio de usuario con las propiedades exactas definidas en la interfaz `User` del frontend (ej. `id`, `name`), corrigiendo los errores del compilador TypeScript.

### B. Pruebas de Delivery (`_deliveryService/tests/`)
Se implementó la suite [**`test_delivery.py`**](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_deliveryService/tests/test_delivery.py):

1.  `test_health_endpoint`: Verifica el estado y respuesta correcta de `/health`.
2.  `test_create_delivery_success`: Verifica que se encole la entrega en memoria con estado `ASIGNADO` y un cálculo correcto de `eta_seconds`.
3.  `test_get_delivery_status` / `test_get_delivery_not_found`: Comprueba consultas correctas y el manejo del error 404.
4.  `test_simulate_delivery_flow`: Valida la transición de estados `ASIGNADO` -> `RECOGIDO` -> `EN_RUTA` -> `ENTREGADO` y la llamada del webhook final.
5.  `test_simulate_delivery_exception` *(Bug Fix)*: Prueba la tolerancia a fallas de la simulación. Se modificó el manejador de excepciones de `main.py` para verificar que `id_venta` exista en memoria antes de intentar cambiar el estado a `ERROR`, eliminando así un fallo `KeyError` no controlado.
6.  `test_notify_backend_success` / `test_notify_backend_retry_then_success`: Prueba que el webhook se envíe con el token correcto y valida la lógica de reintentos asíncronos con backoff exponencial.

---

## 3. Registros de Ejecución Exitosos

### Pruebas de Frontend:
```bash
> mitrufely-web@1.0.0 test:run
> vitest run

 RUN  v3.2.7 C:/Users/lordm/Desktop/Proyectos y clases/UTP CICLO 6/Integrador de Sistemas/proyecto/MitrufelyWeb/_frontEnd

 ✓ src/test/auth.store.test.ts (4 tests) 7ms
 ✓ src/test/Button.test.tsx (4 tests) 102ms

 Test Files  2 passed (2)
      Tests  8 passed (8)
   Duration  1.52s
```

### Pruebas de Delivery:
```bash
pytest -v
============================= test session starts =============================
collected 8 items

tests/test_delivery.py::test_health_endpoint PASSED                      [ 12%]
tests/test_delivery.py::test_create_delivery_success PASSED              [ 25%]
tests/test_delivery.py::test_get_delivery_status PASSED                  [ 37%]
tests/test_delivery.py::test_get_delivery_not_found PASSED               [ 50%]
tests/test_delivery.py::test_simulate_delivery_flow PASSED               [ 62%]
tests/test_delivery.py::test_simulate_delivery_exception PASSED          [ 75%]
tests/test_delivery.py::test_notify_backend_success PASSED               [ 87%]
tests/test_delivery.py::test_notify_backend_retry_then_success PASSED    [100%]

======================== 8 passed, 2 warnings in 5.82s ========================
```
