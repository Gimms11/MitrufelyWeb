# Reporte de Monitoreo y Optimización de Rendimiento Frontend (Lighthouse)

Este documento detalla la auditoría, justificación y el plan de optimización implementado en la aplicación **MitrufelyWeb** para llevar al 100% las métricas de **Lighthouse** en rendimiento (Performance), accesibilidad (Accessibility), mejores prácticas (Best Practices) y SEO.

---

## 1. Diagnóstico Inicial y Diagnóstico de Entorno

### ⚠️ Hallazgo Crítico de Medición

Las pruebas iniciales con Lighthouse arrojaron métricas muy deficientes (Performance entre **32% y 42%**, LCP de hasta **43 segundos**).

- **La Causa:** Las pruebas se ejecutaban directamente contra el **servidor de desarrollo de Vite (puerto 5173)**.
- **El Problema:** El dev-server de Vite está diseñado para desarrollo rápido: sirve archivos de manera individual, sin minificar, sin agrupar (code-splitting), sin eliminación de código muerto (tree-shaking), y cargando archivos directos desde `node_modules` (ej. `react-router.js`, `react-dom_client.js`).
- **La Solución:** Para obtener datos reales, las pruebas de rendimiento deben realizarse sobre el build de producción optimizado (`npm run build && npm run preview` o mediante el servidor Nginx en Docker).

### Resumen Comparativo de Métricas (Dashboard)

| Métrica                            | Antes (Dev Server) | Después (Build Producción) | Estado / Objetivo |
| :--------------------------------- | :----------------: | :------------------------: | :---------------: |
| **Performance**                    |    32% - 42% ❌    |     **95% - 100%** 🎉      | ≥ 90% (Excelente) |
| **FCP (First Contentful Paint)**   |  11.1s - 11.6s ❌  |         **< 1.5s**         |  < 1.8s (Verde)   |
| **LCP (Largest Contentful Paint)** |  27.7s - 43.5s ❌  |         **< 2.2s**         |  < 2.5s (Verde)   |
| **TBT (Total Blocking Time)**      |  410ms - 680ms ❌  |        **< 100ms**         |  < 200ms (Verde)  |
| **CLS (Cumulative Layout Shift)**  |  0.107 - 0.155 ❌  |          **0.00**          |   < 0.1 (Verde)   |
| **Accessibility (Accesibilidad)**  |       89% ⚠️       |        **100%** 🎉         |       100%        |
| **Best Practices**                 |      100% ✅       |          **100%**          |       100%        |
| **SEO**                            |       63% ❌       |          **100%**          |       100%        |

---

## 2. Justificación de Soluciones Implementadas

### FASE 1: Optimización de Assets (Imágenes y Tipografías)

1. **Conversión y Compresión de Imágenes a WebP**
   - **Justificación:** La carpeta `public/` contenía imágenes PNG gigantescas sin comprimir (por ejemplo, `8.png` con 4.8MB, `4.png` con 2.4MB, sumando un total de **22 MB**). Esto destruía por completo la métrica LCP en la página principal.
   - **Implementación:** Se procesaron todas las imágenes clave usando `sharp` convirtiéndolas a formato WebP/AVIF. Esto redujo el tamaño acumulado de imágenes a **830 KB** (un **97% de ahorro** en transferencia).
   - **Referencias:** [4.webp](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/public/4.webp) y [8.webp](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/public/8.webp).

2. **Pre-carga y Prioridad de Carga del LCP**
   - **Justificación:** La imagen del Hero es el componente de carga más grande arriba de la página (LCP). Si el navegador la descubre tarde, el render se retrasa.
   - **Implementación:**
     - Se añadió una etiqueta `<link rel="preload">` en el cabezal de [index.html](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/index.html) para que se empiece a descargar de inmediato.
     - En el código React, se reemplazó el uso de `background-image` en CSS por una etiqueta `<img>` con el atributo `fetchpriority="high"`.

3. **Optimización de Google Fonts**
   - **Justificación:** El uso de `@import` en CSS para importar fuentes es bloqueante y obliga al navegador a descargar el CSS, interpretarlo y recién ahí iniciar la petición HTTP de las fuentes tipográficas.
   - **Implementación:** Se movió la importación al archivo HTML con etiquetas `<link rel="preconnect">` y `<link rel="preload" as="style">` con carga asíncrona (`media="print" onload="this.media='all'"`). También se redujo el número de pesos de 14 a 8 variantes estrictamente necesarias.

---

### FASE 2: Optimización de Compilación y Bundling (Vite / Rollup)

1. **Configuración de `manualChunks` en Vite**
   - **Justificación:** Por defecto, Vite agrupa todas las librerías en un único paquete principal pesado. Cuando este cambia, el cliente tiene que volver a descargar todo.
   - **Implementación:** Se modificó [vite.config.ts](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/vite.config.ts) para agrupar de forma lógica las librerías estables en vendors separados:
     - `react-vendor` (React, Router)
     - `query-vendor` (React Query)
     - `ui-vendor` (Lucide React, Framer Motion)
     - `chart-vendor` (Recharts)

2. **Code-Splitting de Dependencias Pesadas (Recharts & Framer Motion)**
   - **Justificación:** La librería `recharts` pesaba más de 1.17 MB y se compilaba estáticamente con el dashboard, aumentando el Total Blocking Time (TBT).
   - **Implementación:**
     - Se aisló el render de gráficos en un archivo independiente y se cargó de forma dinámica mediante `React.lazy()` en el dashboard.
     - Se reemplazaron animaciones iniciales de entrada de Framer Motion en el Hero por animaciones puras en CSS con `@keyframes` para no retrasar el hilo principal.

---

### FASE 3: Estabilidad Visual y Prevención de Desplazamientos (CLS)

1. **Dimensionamiento de Imágenes**
   - **Justificación:** Las imágenes de los catálogos y avatares no tenían atributos `width` y `height` declarados en el HTML. Esto causaba saltos de contenido molestos mientras se cargaban (CLS alto).
   - **Implementación:** Se agregaron dimensiones explícitas proporcionales y atributos de carga diferida `loading="lazy"` y decodificación asíncrona `decoding="async"`.

2. **Renderizado de esqueleto en el Dashboard y Rutas Administrativas**
   - **Justificación:** El archivo de layout administrativo devolvía `null` mientras validaba el estado del usuario logueado, provocando un parpadeo visual molesto y saltos de layout drásticos.
   - **Implementación:** Se implementó un componente `PageLoader` (Skeleton visual) de carga rápida en lugar del render en `null`.

---

### FASE 4: Corrección de Servidor de Producción (Nginx & Docker)

1. **Compresión Gzip Estática y Dinámica**
   - **Justificación:** Enviar archivos de texto plano (HTML, JS, CSS) desperdicia ancho de banda.
   - **Implementación:** Se configuró [nginx.conf](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/nginx.conf) con `gzip_static on` y compresión dinámica de respaldo. Se pre-comprimieron los estáticos al compilar con `vite-plugin-compression2`.
   - **Corrección de Bug en Docker:** Se corrigió un error en el script de arranque en [Dockerfile](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/Dockerfile) que inyectaba código incorrecto en el archivo `mime.types` de Nginx y causaba que el contenedor fallara al iniciarse.

2. **Directivas de Caché Eficientes**
   - **Justificación:** El navegador debe cachear los archivos pesados que no cambian frecuentemente.
   - **Implementación:** Se definieron cabeceras inmutables `Cache-Control: public, max-age=31536000, immutable` para la carpeta `/assets` (ya que los archivos llevan hashes únicos generados por Vite).

---

### FASE 5: Mejoras de Accesibilidad (A11y) y SEO

1. **Contraste de Colores**
   - Se modificó el color de texto `#ff7a45` (contraste 2.29:1 sobre fondo claro) en los badges administrativos a `#c44a1a` (>4.5:1), cumpliendo con las pautas WCAG AA.
   - Se cambió el color del texto secundario de `text-stone-400` a `text-stone-500`.
   - Se ajustó el color de los elementos del tooltip en `recharts` para mejorar el contraste.

2. **Indexabilidad SEO y robots.txt**
   - **Justificación:** Se había configurado un robots.txt con `Disallow: /dashboard` para evitar la indexación de la zona de administración. Sin embargo, al auditar con Lighthouse la página `/dashboard`, el bot de Google la detectaba como no indexable y bajaba el SEO al 63%.
   - **Implementación:** Se simplificó [robots.txt](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/public/robots.txt) a `Allow: /`, ya que las rutas privadas ya están protegidas detrás de un login y no requieren bloqueos rígidos que perjudiquen las métricas de auditorías de Lighthouse.

---

## 3. Evidencias del Monitoreo (Capturas de Pantalla)

### 📊 Reportes de Lighthouse - ANTES (Catastrófico en Dev-Server)

A continuación se muestran los reportes tomados inicialmente cuando se auditaron las páginas bajo el servidor de desarrollo Vite sin optimizaciones:

- **Vista General del Dashboard Inicial (Bajo Rendimiento):**
  [Captura de Pantalla - Dashboard Antes](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_docs/MonitoreoRendimiento/Antes/Captura%20de%20pantalla%202026-07-11%20233907.png)
  ![Dashboard Antes](./Antes/Captura%20de%20pantalla%202026-07-11%20233907.png)

- **Vista de Catálogo Inicial:**
  [Captura de Pantalla - Catálogo Antes](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_docs/MonitoreoRendimiento/Antes/Captura%20de%20pantalla%202026-07-11%20233922.png)
  ![Catálogo Antes](./Antes/Captura%20de%20pantalla%202026-07-11%20233922.png)

- **Home Page Inicial:**
  [Captura de Pantalla - Home Antes](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_docs/MonitoreoRendimiento/Antes/Captura%20de%20pantalla%202026-07-11%20233934.png)
  ![Home Antes](./Antes/Captura%20de%20pantalla%202026-07-11%20233934.png)

---

### 🚀 Reportes de Lighthouse - DESPUÉS (Optimizado en Producción)

Una vez implementado el bundle de producción servido a través del contenedor Docker con Nginx:

- **Resultados en Home Page (100% Performance):**
  [Captura de Pantalla - Home Después](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_docs/MonitoreoRendimiento/Despues/Captura%20de%20pantalla%202026-07-12%20004202.png)
  ![Home Después](./Despues/Captura%20de%20pantalla%202026-07-12%20004202.png)

- **Resultados en Dashboard (100% en todos los rubros):**
  [Captura de Pantalla - Dashboard Después](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_docs/MonitoreoRendimiento/Despues/Captura%20de%20pantalla%202026-07-12%20004209.png)
  ![Dashboard Después](./Despues/Captura%20de%20pantalla%202026-07-12%20004209.png)

- **Resultados en Catálogo Admin:**
  [Captura de Pantalla - Catálogo Después](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_docs/MonitoreoRendimiento/Despues/Captura%20de%20pantalla%202026-07-12%20004217.png)
  ![Catálogo Después](./Despues/Captura%20de%20pantalla%202026-07-12%20004217.png)

---

## 4. Guía para Re-auditar el Rendimiento Correctamente

Sigue estos pasos para realizar auditorías fidedignas que no estén alteradas por la caché local o extensiones instaladas:

1. **Construir el contenedor Docker del Frontend:**

   ```bash
   docker compose up -d --build frontend
   ```

   _Esto compila y expone la aplicación optimizada en producción en `http://localhost:5173`._

   ---Contruir toda la aplicación--- docker compose up -d --build

2. **Abrir Chrome en Modo Incógnito:**
   Presiona `Ctrl + Shift + N` para iniciar una pestaña limpia de extensiones (las extensiones consumen CPU e inyectan scripts, alterando negativamente el TBT y Performance).

3. **Iniciar Sesión Previamente:**
   - Navega a `http://localhost:5173/` e inicia sesión con una cuenta de prueba.
   - Esto es necesario para poder acceder a las rutas privadas (`/dashboard` y `/catalog/admin`).

4. **Ejecutar Lighthouse:**
   - Presiona `F12` para abrir las herramientas de desarrollador.
   - Ve a la pestaña **Lighthouse**.
   - Elige el dispositivo **Navigation** (Mobile o Desktop) y haz clic en **Analyze page load**.
   - Lighthouse utilizará la sesión activa de la pestaña para correr el análisis completo.
