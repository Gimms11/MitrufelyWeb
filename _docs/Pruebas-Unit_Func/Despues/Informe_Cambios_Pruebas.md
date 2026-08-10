# 🔧 Informe de Cambios y Nuevas Pruebas Implementadas

Este documento detalla las configuraciones de entorno, los archivos creados y las pruebas automatizadas implementadas para resolver los vacíos de testing en el Frontend del proyecto **MitrufelyWeb**.

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


> **Nota:** Las pruebas del microservicio `_deliveryService` (8 tests en `test_delivery.py`) fueron eliminadas junto con el microservicio, que fue reemplazado por la máquina de estados del backend principal.

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
> **Eliminado:** El microservicio `_deliveryService` y sus 8 pruebas fueron removidos del proyecto.
