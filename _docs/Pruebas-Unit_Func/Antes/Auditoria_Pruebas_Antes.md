# 🔍 Auditoría de Pruebas de Software (Antes de la Implementación)

Este documento detalla el diagnóstico inicial del entorno de pruebas del proyecto **MitrufelyWeb** antes de las optimizaciones e integraciones realizadas el 20 de julio de 2026.

---

## 1. Estado Inicial del Testing por Componente

Al iniciar la auditoría de control de calidad del software, se identificó una cobertura de pruebas desigual entre los diferentes componentes del proyecto:

### A. Backend (`_backEnd`)
*   **Estado:** Fuerte y maduro.
*   **Detalle:** El backend principal contaba con una suite de 138 pruebas unitarias, de integración y E2E que cubrían de forma satisfactoria los casos de uso transaccionales (cálculo de IGV, lógica de SweetCoins, triggers FEFO de inventario y la máquina de estados de pedidos).

### B. Frontend SPA (`_frontEnd`)
*   **Estado:** **Nulo (0% Cobertura / Sin framework de pruebas).**
*   **Detalle:** No existía ningún archivo de pruebas (unitarias, componentes o de integración). El archivo `package.json` no contenía ninguna dependencia de testing (`vitest`, `jest`, `@testing-library/react`), ni scripts para ejecutar pruebas en el flujo de desarrollo. Cualquier cambio en componentes compartidos o en la lógica de Zustand presentaba un alto riesgo de introducir regresiones silenciosas.

### C. Microservicio de Delivery (`_deliveryService`)
*   **Estado:** **Nulo (0% Cobertura).**
*   **Detalle:** Un microservicio FastAPI sencillo pero crítico (simula la preparación y envío e invoca un webhook del backend principal para marcar la venta como completada). No contaba con pruebas para sus endpoints, la simulación de background ni para la robustez del envío de su webhook.

---

## 2. Hallazgos y Riesgos Críticos Identificados

### 1. Ausencia de Pruebas de Contrato en la Comunicación Frontend-Backend
El frontend utiliza interfaces tipadas como `User` en TypeScript con nomenclatura en inglés y camelCase (ej: `id`, `name`, `email`, `role`). Por otro lado, la base de datos y ciertos servicios del backend utilizan nombres en español y snake_case (ej: `id_usuario`, `nombres`, `apellidos`). Al no haber pruebas unitarias en el store de autenticación (`useAuthStore`), existía el riesgo latente de mapear incorrectamente los payloads recibidos del backend.

### 2. Error Crítico No Controlado en la Simulación de Delivery (main.py)
Al revisar la lógica del simulador de entregas (`_simulate_delivery` en `_deliveryService/main.py`), se descubrió la siguiente porción de código en el bloque del manejador de excepciones:

```python
except Exception as e:
    logger.error("delivery.simulation_error", id_venta=id_venta, error=str(e))
    deliveries[id_venta]["status"] = "ERROR"
```

*   **El Riesgo:** Si se llamaba a la simulación con un `id_venta` inválido o no registrado en el diccionario en memoria `deliveries`, se generaba un error interno (`KeyError`). El bloque `except` intentaba capturar el error, pero al ejecutar `deliveries[id_venta]["status"] = "ERROR"` para un ID inexistente, levantaba un **segundo KeyError no controlado**, provocando el crash total del hilo asíncrono sin poder auditar ni loguear el fallo original de forma limpia.

### 3. Exposición de Endpoints de Delivery sin Pruebas de Robustez
El endpoint `/deliveries` (POST) realiza una simulación que dura varios segundos. Sin pruebas automatizadas que simulen múltiples peticiones, no se podía garantizar que el microservicio pudiera encolar múltiples tareas asíncronas en segundo plano sin bloquear el hilo principal del servidor FastAPI.
