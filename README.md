# 🎂 Mitrufely Web — Plataforma Transaccional y de Gestión para Pastelería

[![React](https://img.shields.io/badge/FrontEnd-React%2019%20%2B%20TS-61DAFB?logo=react&style=flat-square)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/BackEnd-FastAPI%20%28Python%29-009688?logo=fastapi&style=flat-square)](https://fastapi.tiangolo.com/)
[![Docker](https://img.shields.io/badge/DevOps-Docker%20%26%20Compose-2496ED?logo=docker&style=flat-square)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Mitrufely Web** es una solución informática transaccional de nivel empresarial (*Enterprise-scale*) diseñada para la digitalización de la cadena de suministro, fidelización de clientes y ventas online de una pastelería artesanal. El proyecto adopta una **Arquitectura Limpia (Clean Architecture)** altamente desacoplada y principios de diseño robustos y seguros.

Este repositorio ha sido desarrollado como el proyecto integrador principal para el curso **Integrador de Sistemas** (Ciclo VI - UTP). Aunque el sílabo académico plantea el uso de Java, esta solución ha sido implementada en **Python (FastAPI)** y **TypeScript (React)**, mapeando y adaptando rigurosamente todos los estándares y patrones de ingeniería exigidos por la cátedra.

---

## 🗺️ Mapeo del Sílabo Académico: De Java a FastAPI (Enterprise)

Para cumplir con las competencias del curso, los conceptos y recursos de la pila tecnológica tradicional de Java se adaptaron a la pila moderna de Python/FastAPI:

| Concepto en Sílabo (Java) | Implementación Equivalente en Mitrufely Web (FastAPI / Python) | Justificación de Ingeniería |
| :--- | :--- | :--- |
| **Arquitectura MVC / DAO** | **Routers, Services y Repositories** | Separación clara de responsabilidades. La lógica de negocio está aislada de la infraestructura de base de datos y de la capa HTTP. |
| **Google Guava** | **Pydantic V2 & Tenacity** | Validación robusta de tipos de datos a nivel de runtime y políticas de reintento transaccional automáticas ante fallos transitorios. |
| **Apache POI** | **OpenPyXL & XlsxWriter** | Generación y formateo en memoria de reportes tabulares complejos y exportaciones de inventario a archivos de hoja de cálculo Excel. |
| **Apache Commons** | **Cryptography & Pillow** | Utilidades de encriptación de datos sensibles y procesamiento asíncrono y redimensionado óptimo de imágenes para pastelería. |
| **Logback / SLF4J** | **Structlog & Python-JSON-Logger** | Registro de logs estructurados en formato JSON listos para su ingesta en sistemas APM, con trazabilidad inyectando `request_id`. |
| **Maven / Spring Boot** | **Pip + Uvicorn + Pydantic-Settings** | Gestión estricta de dependencias y de la configuración a través de variables de entorno con validación estática de tipos. |

---

## 🛠️ Stack Tecnológico

### Frontend (SPA)
*   **Core:** React 19 (TypeScript) + Vite
*   **Estilos:** Tailwind CSS + Framer Motion (para micro-animaciones premium)
*   **Client State:** Zustand (gestión ligera del estado de autenticación y carrito)
*   **Server State & Cache:** TanStack Query V5 (React Query)
*   **Comunicación:** Axios (con interceptores para refresh token automático y control de errores)

### Backend (REST API)
*   **Framework:** FastAPI (Python 3.11+)
*   **Base de Datos ORM:** SQLAlchemy 2.0 (Capa asíncrona mediante `asyncpg` y pools optimizados)
*   **Motor de Base de Datos:** PostgreSQL (Neon Serverless DB en producción)
*   **Cola de Tareas y Planificador:** Celery + Celery Beat (ejecución periódica de tareas de mantenimiento)
*   **Broker de Mensajería & Cache:** Redis / Valkey

### DevOps y Despliegue
*   **Contenedores:** Docker & Docker Compose (ambientes idénticos para desarrollo y pruebas)
*   **Servidor Web Frontend:** Nginx (dentro del contenedor, configurado con gzip estático y SPA routing)
*   **Plataformas Cloud:** **Vercel** (Frontend con SPA routing fallback) y **Render** (Backend FastAPI + Valkey KeyValue)

---

## 🔒 Auditoría y Mitigación de Seguridad (OWASP ZAP)

El sistema fue sometido a auditorías de seguridad dinámicas (DAST) utilizando **OWASP ZAP**, implementándose las siguientes protecciones en base al reporte de observaciones:

1.  **Format String & Input Validation (CWE-20 / CWE-134):** Validación y parseo estricto del formato JWT proveniente de proveedores externos (Google) para evitar desbordamientos y denegaciones de servicio no controladas (HTTP 500).
2.  **CORS Hardening (CWE-942):** Configuración restrictiva de CORS en FastAPI rechazando comodines (`*`) cuando se permiten credenciales de sesión. La variable `ALLOWED_ORIGINS` lee explícitamente los dominios autorizados de producción.
3.  **Rate Limiting (CWE-770):** Implementación de límites de peticiones en los endpoints sensibles (autenticación y recuperación de contraseñas) mediante `slowapi` con persistencia en Redis.
4.  **Security Headers (CWE-693):** Nginx y FastAPI inyectan cabeceras esenciales en cada petición (`Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` y `Referrer-Policy`).
5.  **Information Leakage (CWE-532):** Sanitización de logs utilizando filtros de contexto en `structlog` para impedir el registro accidental de tokens de acceso, passwords o información de identificación personal (PII) en los logs del servidor.

---

## 🧪 Pruebas de Software (QA)

El backend cuenta con una suite de pruebas automatizadas construida sobre `pytest` y `pytest-asyncio`. Se abarcan:
*   **Pruebas Unitarias:** Validación aislada de las reglas de negocio, conversión de SweetCoins y generación de reportes.
*   **Pruebas de Integración:** Llamadas HTTP simuladas a los endpoints utilizando base de datos en memoria para verificar flujos transaccionales completos.

Para ejecutar los tests locales:
```bash
cd _backEnd
pytest
```

---

## ⚙️ Plan de Monitoreo y Mantenimiento

*   **Monitoreo de Salud:** Endpoint dedicado `/api/v1/health` que realiza verificaciones activas sobre la conexión a la base de datos PostgreSQL y al cliente Redis/Valkey.
*   **Mantenimiento Programado (Celery Beat):** 
    - `expire-pending-ventas`: Libera el stock reservado de compras no concretadas cada 5 minutos.
    - `expire-lots-daily`: Marca lotes de insumos vencidos en el inventario diariamente.
    - `expire-coupons-daily`: Caduca automáticamente cupones de fidelización no utilizados.

---

## 🚀 Guía de Ejecución Local (Docker)

El proyecto está completamente Dockerizado y listo para correr localmente con un único comando:

### Requisitos Previos
*   Docker y Docker Desktop instalados en el sistema.

### Pasos para iniciar:
1.  Clona el repositorio.
2.  Crea un archivo `.env` en la carpeta `_backEnd/` tomando como referencia `_backEnd/.env.example`.
3.  Crea un archivo `.env` en la carpeta `_frontEnd/` tomando como referencia `_frontEnd/.env.example`.
4.  Ejecuta desde la raíz del proyecto:
    ```bash
    docker compose up --build
    ```
5.  Accede a los servicios locales:
    *   **Frontend:** `http://localhost:5173`
    *   **Backend API:** `http://localhost:8000`
    *   **FastAPI Swagger Docs:** `http://localhost:8000/api/docs`

---

## ☁️ Guía de Despliegue en la Nube

Para realizar el despliegue del ecosistema Mitrufely en producción:

### 1. Backend en Render (Blueprint)
El repositorio incluye un archivo `render.yaml` en la raíz. Al conectarlo con Render, se creará el servicio API y la base KeyValue (Valkey) gratis de manera automática:
1.  Crea un **Blueprint** en Render apuntando a este repositorio.
2.  Rellena las variables secretas requeridas en la interfaz de Render (`DATABASE_URL`, `SMTP_*`, `CLOUDINARY_*`, `GOOGLE_CLIENT_ID`).
3.  Copia la URL provista por Render (ej. `https://mifrufely-backend.onrender.com`).

### 2. Frontend en Vercel
1.  Crea un nuevo proyecto en Vercel e importa el repositorio.
2.  Configura el **Root Directory** del proyecto en la carpeta **`_frontEnd`**.
3.  Configura las variables de entorno:
    *   `VITE_API_BASE_URL` apuntando a `https://mifrufely-backend.onrender.com/api/v1`.
    *   `VITE_GOOGLE_CLIENT_ID` con tu credencial de Google OAuth.
4.  Realiza el despliegue. Vercel utilizará el archivo `vercel.json` para gestionar el routing de la SPA de forma nativa.
5.  Actualiza las variables `FRONTEND_URL` y `ALLOWED_ORIGINS` en el dashboard de Render con tu URL de Vercel para autorizar el intercambio CORS de producción.
