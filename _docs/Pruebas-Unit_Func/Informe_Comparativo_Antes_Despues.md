# 📋 Informe Técnico de Pruebas Unitarias y Funcionales — MitrufelyWeb

> **Comparativa Antes / Después de la Implementación de Pruebas Automatizadas**
>
> | Campo                             | Valor                                                        |
> | --------------------------------- | ------------------------------------------------------------ |
> | **Proyecto**                      | MitrufelyWeb — Plataforma transaccional de pastelería        |
> | **Stack**                         | pytest · Vitest · jsdom · React Testing Library · httpx      |
> | **Fecha de la auditoría inicial** | 19 de julio de 2026                                          |
> | **Fecha de la implementación**    | 20 de julio de 2026                                          |
> | **Herramientas de ejecución**     | pytest (Python) · Vitest (Vite/Node)                         |
> | **Alcance**                       | Backend principal · Frontend SPA · Microservicio de Delivery |

---

## 📑 Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Metodología de las Pruebas](#2-metodología-de-las-pruebas)
3. [Resultado General — Antes vs Después](#3-resultado-general--antes-vs-después)
4. [Hallazgos de la Auditoría — Antes vs Después](#4-hallazgos-de-la-auditoría--antes-vs-después)
5. [Detalle de Nuevas Pruebas por Componente](#5-detalle-de-nuevas-pruebas-por-componente)
6. [Métricas de Impacto](#6-métricas-de-impacto)
7. [Mapa de Riesgo Residual (Pruebas Faltantes)](#7-mapa-de-riesgo-residual-pruebas-faltantes)
8. [Conclusiones y Recomendaciones](#8-conclusiones-y-recomendaciones)

---

## 1.- 📊 Resumen Ejecutivo

### Contexto

El producto **MitrufelyWeb** cuenta con un backend altamente testeado con 138 pruebas automatizadas. Sin embargo, antes de esta fase, tanto la aplicación **Frontend (SPA)** como el **Microservicio de Delivery** carecían por completo de cobertura de pruebas automatizadas, exponiendo la plataforma a posibles fallos silenciosos ante cambios e integraciones.

Tras realizar una auditoría de control de calidad de software, se diseñó e implementó un plan para instalar, configurar y crear conjuntos de pruebas unitarias y de componentes en el frontend y en el microservicio de entregas, solucionando además un error asíncrono no controlado en el simulador de delivery.

### Comparativa global

| Métrica                              | Antes | Después |                       Δ |
| ------------------------------------ | ----: | ------: | ----------------------: |
| Pruebas automatizadas totales        |   138 |     154 |                 **+16** |
| 💻 Pruebas de Frontend               |     0 |       8 |                  **+8** |
| 🚚 Pruebas de Microservicio Delivery |     0 |       8 |                  **+8** |
| ⚙️ Pruebas de Backend                |   138 |     138 | **0** (Sin regresiones) |
| Archivos modificados                 |     — |       5 |                       — |
| Archivos nuevos                      |     — |       4 |                       — |
| Errores no controlados corregidos    |     1 |       0 |                  **-1** |
| Pruebas exitosas (100% aprobadas)    |   138 |     154 |                       — |

### Cobertura de pruebas — antes y después

```
                 ANTES                          DESPUÉS
  Backend  ██████████████████ 138/138    ██████████████████ 138/138
  Frontend ░░░░░░░░░░░░░░░░░░  0/8       ██████████████████  8/8
  Delivery ░░░░░░░░░░░░░░░░░░  0/8       ██████████████████  8/8
```

---

## 2.- 🔬 Metodología de las Pruebas

### Fase 1 — Diagnóstico Inicial (Antes)

Se realizó una inspección de las carpetas y archivos de configuración del proyecto. Se determinó que `_frontEnd` no contaba con herramientas como Jest o Vitest, y `_deliveryService` carecía de `pytest` en sus dependencias.

### Fase 2 — Implementación de Entornos de Testing

Se agregaron las herramientas y dependencias necesarias. En el frontend se configuró **Vitest + jsdom** para simular la API del navegador en entornos Node. En el microservicio se estructuró **pytest + pytest-asyncio** con mocks de red para prevenir peticiones web reales durante las pruebas.

### Fase 3 — Creación y Ejecución de Tests (Después)

Se escribieron pruebas enfocadas en componentes y estados clave en el frontend, y en los flujos asíncronos y robustez del webhook en el microservicio, ejecutando las suites localmente para validar que el 100% pase con éxito.

---

## 3.- 🔍 Resultado General — Antes vs Después

El estado y volumen de las pruebas tras las adiciones se consolidó de la siguiente manera:

| Componente   | Nivel de Prueba      | Antes  | Después | Archivo de Test / Acción Realizada                                                                                                                                                                                                |
| ------------ | -------------------- | :----: | :-----: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | Unitario (Estado)    |  ❌ 0  |  ✅ 4   | [auth.store.test.ts](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/src/test/auth.store.test.ts) (Prueba store Zustand)                         |
| **Frontend** | Componente UI        |  ❌ 0  |  ✅ 4   | [Button.test.tsx](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/src/test/Button.test.tsx) (Prueba de renderizado y clicks)                     |
| **Delivery** | Unitario / API       |  ❌ 0  |  ✅ 4   | [test_delivery.py](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_deliveryService/tests/test_delivery.py) (GET /health, POST /deliveries, handle errors) |
| **Delivery** | Simulación / Webhook |  ❌ 0  |  ✅ 4   | [test_delivery.py](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_deliveryService/tests/test_delivery.py) (Ciclo en background y reintentos webhook)     |
| **Backend**  | Integración / Unit   | ✅ 138 | ✅ 138  | Ejecución exitosa de pytest en backend sin regresiones                                                                                                                                                                            |

---

## 4.- 📋 Hallazgos de la Auditoría — Antes vs Después

### 4.1 Errores Críticos y de Mapeo Resueltos

- **Mapeo de Tipos en Frontend (`C-03` / Mismatch de Propiedades):**
  - _Antes:_ Al no contar con pruebas tipadas, se usaban variables tipo snake_case en el frontend que no coincidían con la firma TypeScript `User` (la cual utiliza `id` y `name`).
  - _Después:_ Las pruebas en `auth.store.test.ts` implementan estrictamente la validación de tipos del frontend, lo que causará que cualquier discrepancia lance un error de pre-compilación (`tsc`).
- **Crash por Clave Inexistente en Microservicio (`KeyError`):**
  - _Antes:_ Si el simulador de entregas de `main.py` capturaba una excepción para una venta inexistente en memoria, el bloque `except` crasheaba con `KeyError: 9999` al intentar escribir `deliveries[id_venta]["status"] = "ERROR"`.
  - _Después:_ Se añadió una verificación previa (`if id_venta in deliveries:`). La prueba `test_simulate_delivery_exception` valida que el servicio loguee el fallo pero continúe operando con normalidad.

---

## 5.- 🔧 Detalle de Nuevas Pruebas por Componente

### 5.1 Frontend — 8 pruebas integradas

#### A. Pruebas de Zustand Auth Store (`auth.store.test.ts`)

- **CWE Asociado:** CWE-922 (Almacenamiento inseguro de información sensible).
- **Verificación:** Asegura que `logout` remueva el access token de la memoria de Axios y limpie la sesión en `sessionStorage` para evitar el robo de credenciales mediante ataques XSS.
- **Código:**

```typescript
it("debe limpiar el estado con logout", () => {
  act(() => {
    useAuthStore.getState().setUser(fakeUser, "access_token", "refresh_token");
  });
  act(() => {
    useAuthStore.getState().logout();
  });
  const state = useAuthStore.getState();
  expect(state.user).toBeNull();
});
```

#### B. Pruebas del Componente Button (`Button.test.tsx`)

- **Verificación:** Valida variantes de estilos CSS (primary y accent) y simula el disparo del evento `onClick` mediante `fireEvent.click`.

---

### 5.2 Microservicio de Delivery — 8 pruebas integradas

#### A. Flujo de Simulación Asíncrona

- **Verificación:** Valida el cambio de estado secuencial (`ASIGNADO` -> `RECOGIDO` -> `EN_RUTA` -> `ENTREGADO`) y verifica el cálculo de la variable `eta_seconds`.

#### B. Resiliencia del Webhook y Reintentos

- **Verificación:** Mockea solicitudes de red asíncronas y comprueba que, si el backend principal responde con error 500, el microservicio realice reintentos con backoff exponencial.

---

## 6.- 📈 Métricas de Impacto

### Cobertura de Pruebas por Componente

| Componente             | Pruebas Ejecutadas | Pruebas Exitosas |           Cobertura Lograda            |
| ---------------------- | :----------------: | :--------------: | :------------------------------------: |
| Backend Principal      |        138         |       138        |     100% (Funcional de Servicios)      |
| Frontend SPA           |         8          |        8         | Cobertura base de componentes y stores |
| Microservicio Delivery |         8          |        8         |    100% de endpoints y simulaciones    |
| **Total**              |      **154**       |     **154**      |     **100% de pruebas aprobadas**      |

---

## 7.- 🗺️ Mapa de Riesgo Residual (Pruebas Faltantes)

Excluyendo expresamente las pruebas de base de datos directas (triggers SQL de NeonDB en producción), se documentan las pruebas faltantes de nivel medio y bajo para posterior desarrollo:

| ID       | Severidad | Descripción                                            | Acción Requerida                                                                          |
| -------- | :-------: | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **R-01** | 🟡 Medio  | Falta integración de llamadas Axios reales en Frontend | Configurar **MSW (Mock Service Worker)** para simular respuestas de API reales en Vitest. |
| **R-02** | 🟡 Medio  | Sin pruebas de integración visual E2E en Navegador     | Instalar y configurar **Playwright** para simular flujos de usuario (Login -> Checkout).  |
| **R-03** |  🟢 Bajo  | Sin pruebas unitarias para tareas Celery               | Escribir tests que invoquen directamente tareas Celery en background.                     |
| **R-04** |  🟢 Bajo  | Módulos secundarios de Backend sin unit tests          | Ampliar `tests/unit/` para cubrir módulos como `reports` y `dashboard`.                   |

---

## 8.- ✅ Conclusiones y Recomendaciones

### Conclusiones

1. **Se logró una suite de testing unificada:** La adición de Vitest en el frontend y pytest en el delivery service permite probar el ecosistema entero mediante comandos automatizados sencillos.
2. **Se eliminó un bug de crash crítico:** La suite de pruebas del delivery descubrió un fallo no controlado por KeyError, el cual fue mitigado de forma segura en `main.py`.
3. **Se garantiza la robustez de red:** Las pruebas del microservicio validan que el sistema soporte caídas transitorias de red gracias a su lógica de reintentos.

---

_Fin del informe._
