# 🚀 Fase 8: Migración de Base de Datos, Capa de Parseo Frontend y Despliegue Serverless GCP

Este documento describe las actividades, decisiones técnicas y validaciones realizadas en la **Fase 8** de MitrufelyWeb, que comprende la refactorización del modelo de fechas FEFO en base de datos, la capa de parseo robusto en el frontend y el despliegue serverless completo en Google Cloud Platform.

---

## 1. 🎯 Objetivos de la Fase

1. **Migración FEFO en NeonDB:** Normalizar el campo `lotes.fecha_vencimiento` de `TIMESTAMP` a `DATE` para evitar desajustes de zona horaria y actualizar el procedimiento almacenado `sp_expirar_lotes_vencidos()`.
2. **Capa de Parseo de Fechas Frontend:** Crear una arquitectura de parseo y formateo a prueba de desfaces de zona horaria (UTC-5 Lima) y validaciones Zod estrictas sin casteo forzado (`as any`).
3. **Pruebas Unitarias Frontend:** Validar el 100% de los casos de prueba de utilidades y componentes del frontend con Vitest.
4. **Infraestructura Serverless en GCP:** Migrar el backend a **Google Cloud Run (Scale-to-Zero)**, sustituir Celery por **GCP Cloud Tasks** y **Cloud Scheduler** con autenticación OIDC.
5. **Caché Resiliente y CORS:** Implementar fallback en memoria para Rate Limiting (`slowapi`) y resolver políticas CORS para el frontend en Vercel.

---

## 2. 🗄️ 1. Migración en Neon PostgreSQL

### i. Problema detectado:
El campo `fecha_vencimiento` en la tabla `lotes` estaba definido como `TIMESTAMP WITH TIME ZONE`. Al almacenar fechas sin componente horario (ej. `2026-08-30`), las conversiones automáticas entre UTC y la zona horaria del cliente (UTC-5) generaban desfaces de un día hacia atrás (`2026-08-29 19:00:00-05`).

### ii. Solución ejecutada:
1. **Alteración de columna:**
   ```sql
   ALTER TABLE lotes
   ALTER COLUMN fecha_vencimiento TYPE DATE
   USING fecha_vencimiento::date;
   ```
2. **Actualización de Procedimiento Almacenado:**
   ```sql
   CREATE OR REPLACE FUNCTION sp_expirar_lotes_vencidos()
   RETURNS TABLE(lotes_afectados integer, stock_vencido_total integer)
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $function$
   ...
   -- Comparación directa de fecha calendario sin componente de hora
   WHERE l.estado = 'ACTIVO' AND l.fecha_vencimiento < CURRENT_DATE
   ...
   $function$;
   ```
3. **Verificación:** Ejecutado en vivo en la base de datos de NeonDB con 0 errores y consistencia transaccional.

---

## 3. 🛡️ 2. Capa de Parseo Robusto en Frontend

Se implementó el módulo [`_frontEnd/src/shared/utils/date.ts`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/src/shared/utils/date.ts):

### Funciones Principales:
* **`parseDate(input)`:**
  * Detecta si el string es de tipo fecha pura (`YYYY-MM-DD`).
  * Construye la fecha usando el constructor local `new Date(year, monthIndex, day)` evitando el parser nativo de JavaScript que asume UTC para strings ISO.
  * Valida que no ocurra *date rollover* (ej. `2026-02-30` o `2026-13-40`).
* **`formatDateShort(input)`:** Retorna la fecha en formato localizado peruano `DD/MM/YYYY`.
* **`formatDateIso(input)`:** Retorna el string `YYYY-MM-DD` para envío seguro a la API.
* **`daysUntil(input)`:** Calcula los días calendario exactos entre la medianoche local de hoy y la medianoche de la fecha destino.
* **`isDateExpired(input)` / `isDateExpiringSoon(input, thresholdDays)`:** Métodos semánticos para cálculo visual de badges FEFO en tablas de lotes.

### Componentes Refactorizados:
* `LotsTable.tsx`: Badges de vencimiento y cálculo de días restantes.
* `AdjustStockModal.tsx`: Visualización de fecha de lote formateada.
* `RegisterLotModal.tsx`: Input HTML5 `type="date"` con validación Zod (`daysUntil(val) >= 0`) y eliminación de todos los `as any`.

### Resultados de Pruebas:
* **Archivo de pruebas:** [`_frontEnd/src/test/date.utils.test.ts`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/src/test/date.utils.test.ts) (13 pruebas unitarias de fechas).
* **Total suite frontend:** **30/30 tests aprobados (100%)**, `tsc -b` con 0 errores de tipos, Vite build en 2.66s.

---

## 4. ☁️ 3. Despliegue en Google Cloud Platform (GCP)

### i. Arquitectura Serverless Scale-to-Zero
* **Cloud Run:** Servicio `mifrufely-backend` en `us-central1`.
  * `min-instances: 0` (costo $0 en reposo, permite suspensión de NeonDB).
  * `max-instances: 10` (concurrencia de hasta 800 peticiones simultáneas).
* **Cloud Tasks:** Cola `mifrufely-tasks` para despacho desacoplado de correos electrónicos transaccionales con reintentos exponenciales.
* **Cloud Scheduler:** 4 crons automatizados con llamadas autenticadas mediante tokens OIDC y Service Account `mifrufely-backend-invoker@mitrufely.iam.gserviceaccount.com`.

### ii. Resiliencia de Caché y Rate Limiting
* Se implementó `ResilientRedisClient` en [`redis_client.py`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_backEnd/app/infrastructure/cache/redis_client.py) que conmuta a `InMemoryFallbackRedis` con TTL pasivo cuando corre en Cloud Run.
* `slowapi` utiliza `storage_uri="memory://"` en producción, eliminando fallos de conexión a Redis y asegurando que las respuestas contengan cabeceras CORS en todo momento.

---

## 5. 📊 Matriz de Verificación Final

| Validación | Comando / Endpoint | Resultado | Estado |
|---|---|---|---|
| **Health Check Cloud Run** | `GET /api/v1/health` | `{"status":"ok","service":"mifrufely-backend"}` | ✅ PASÓ |
| **NeonDB Query vía Cloud Run** | `GET /api/v1/categorias` | Retornó 3 categorías activas desde NeonDB | ✅ PASÓ |
| **CORS Preflight (OPTIONS)** | `OPTIONS /api/v1/auth/google` | `Access-Control-Allow-Origin: https://mitrufely-web.vercel.app` | ✅ PASÓ |
| **Cloud Scheduler Job** | `gcloud scheduler jobs run expire-lots-daily` | Invocación OIDC exitosa (código 200) | ✅ PASÓ |
| **Frontend Test Suite** | `npx vitest run` | 30 tests pasaron (100%) | ✅ PASÓ |
| **Frontend Typecheck** | `npx tsc -b` | 0 errores TypeScript | ✅ PASÓ |
| **Frontend Vercel** | `https://mitrufely-web.vercel.app` | HTTP 200 OK | ✅ PASÓ |
