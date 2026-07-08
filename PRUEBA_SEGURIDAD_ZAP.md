# 🔐 Prueba de Seguridad — Escaneo de Vulnerabilidades con OWASP ZAP

> **Proyecto:** MitrufelyWeb (API FastAPI + Frontend React/Vite)
> **Objetivo:** Detectar una vulnerabilidad real en la API y corregirla, demostrando el "antes" y "después".

Esta es **una sola prueba dividida en dos tareas independientes**, simples y sin necesidad de montar un entorno de pruebas automatizado.

**¿Por qué OWASP ZAP?** Porque es automático, visual, difícil de errar y genera un reporte profesional (HTML/PDF) que impresiona en la presentación.

---

## ✅ Pre-requisito (común a ambos integrantes)

1. **Levantar la API** del backend de MitrufelyWeb:

   ```bash
   cd _backEnd
   uvicorn app.main:app --reload --port 8000
   ```

   Verificar que responda en: <http://localhost:8000/api/docs>

2. **Descargar OWASP ZAP** (gratis) desde: <https://www.zaproxy.org/download/>

> 💡 No se necesita levantar el frontend ni la base de datos para esta prueba. Solo la API.

---

## 👤 TAREA 1 — Integrante A: Ejecutar el Escaneo y generar el reporte

**Objetivo:** Escanear la API de MitrufelyWeb automáticamente y exportar los hallazgos en HTML.

### Paso a paso

1. Abrir **OWASP ZAP** y dejar que cargue por completo.
2. En el cuadro superior izquierdo (**Quick Start**), seleccionar **"Automated Scan"** (Escaneo Automatizado).
3. En el campo **URL**, escribir exactamente:

   ```
   http://localhost:8000
   ```

4. Hacer clic en **"Attack"** (Atacar).
5. ⏳ Esperar entre **10 y 15 minutos**. ZAP atacará los endpoints de la API. La barra inferior se llenará de colores (verde, amarillo, rojo).
6. Cuando termine (la barra llegue al **100%** y se detenga), ir a la pestaña superior **"Alerts"** (Alertas).
7. Anotar todas las alertas que aparezcan en color **Rojo (Alta)** y **Naranja (Media)**.
   - En este proyecto, casi con seguridad aparecerá una alerta de **CORS** o **CORS Misconfiguration**, además de otras menores (Missing Anti-CSRF, Cookie sin flags, etc.).
8. Finalmente, ir al menú superior: **Report → HTML Report...**
9. Guardar el archivo como:

   ```
   Reporte_ZAP_IntegranteA.html
   ```

### 📦 Entregable del Integrante A

- El archivo `Reporte_ZAP_IntegranteA.html` generado por ZAP (se puede abrir en el navegador y, si se desea, imprimir a PDF).

---

## 🛠️ TAREA 2 — Integrante B: Analizar resultados y aplicar la corrección

**Objetivo:** Tomar el reporte del Integrante A, localizar la vulnerabilidad de CORS y endurecer la configuración para que la alerta desaparezca.

> 📌 **Nota importante sobre este proyecto:** MitrufelyWeb **ya centraliza la configuración CORS** en un archivo de settings (`_backEnd/app/core/config.py`), no hardcoded en `main.py`. Por eso la corrección se hace editando las variables de configuración, no el código del middleware. Esto es más limpio y profesional.

### Paso a paso

1. Abrir el reporte `Reporte_ZAP_IntegranteA.html` (el que hizo el compañero).
2. Buscar en la lista de vulnerabilidades la alerta llamada **"CORS Allow Origin"**, **"CORS Misconfiguration"** o similar. Anotar su severidad.

3. Abrir en VS Code el archivo de configuración:

   ```
   _backEnd/app/core/config.py
   ```

4. Localizar el bloque **CORS** (alrededor de la línea 57). Actualmente se ve así:

   ```python
   # ── CORS ─────────────────────────────────────────────────────────────────
   ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
   ALLOWED_METHODS: list[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
   ALLOWED_HEADERS: list[str] = ["*"]
   ```

   🔴 **Lo vulnerable:** `ALLOWED_HEADERS: list[str] = ["*"]` permite **cualquier** cabecera HTTP, lo cual ZAP marca como debilidad CORS. El origen ya está restringido, pero los headers quedaron abiertos.

5. Reemplazar ese bloque completo por la versión **endurecida**:

   ```python
   # ── CORS (endurecido para pasar el escaneo ZAP) ──────────────────────────
   ALLOWED_ORIGINS: list[str] = [
       "http://localhost:5173",   # Frontend Vite (desarrollo)
       "http://localhost:4173",   # Frontend Vite (preview)
       "http://localhost:3000",   # Alternativa
   ]
   ALLOWED_METHODS: list[str] = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
   ALLOWED_HEADERS: list[str] = ["Authorization", "Content-Type", "X-Request-ID"]
   ```

   Cambios clave:
   - `ALLOWED_HEADERS` ahora lista **explícitamente** solo las cabeceras que la API realmente usa (en lugar del comodín `"*"`).
   - `ALLOWED_ORIGINS` queda acotado solo a los puertos del frontend (5173, 4173 y 3000).

6. Guardar el archivo. Si la API corre con `--reload`, se reiniciará sola; si no, reiniciarla manualmente.

### 📦 Entregable del Integrante B

1. **Screenshot del código modificado** (`config.py` con el nuevo bloque CORS).
2. **(Opcional pero ideal para la nota):** Pedir al Integrante A que **vuelva a correr el escaneo ZAP** sobre `http://localhost:8000` para demostrar que la alerta de **CORS desapareció** (o bajó de severidad).
   - Tener el **"Antes" y "Después"** es una excelente nota para la presentación.

---

## 🧠 Resumen — ¿Por qué esta prueba funciona?

| Integrante | Rol | Dificultad |
|------------|-----|------------|
| **A** | Ejecuta ZAP con clics y genera un reporte profesional **sin tocar código**. | 🟢 Muy fácil |
| **B** | Lee el reporte, busca la palabra **"CORS"**, y edita **3 líneas** en `config.py`. | 🟢 Muy fácil |

Ambos tienen trabajo **independiente, sencillo y justificable** para la nota del curso, y juntos producen una demostración completa de **detección + corrección** de una vulnerabilidad real.

---

## 📁 Archivos involucrados

| Archivo | Propósito |
|---------|-----------|
| `_backEnd/app/main.py` | Punto de entrada de FastAPI (ya usa `settings.ALLOWED_ORIGINS`, **no se edita**). |
| `_backEnd/app/core/config.py` | **Aquí se corrige** el CORS (Tarea 2). |
| `Reporte_ZAP_IntegranteA.html` | Reporte generado por ZAP (entregable Tarea 1). |
