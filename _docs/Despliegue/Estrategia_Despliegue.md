# 📋 Estrategia de Despliegue en la Nube — MitrufelyWeb

Este documento describe la estrategia de despliegue en la nube del sistema **MitrufelyWeb**. La solución se publica bajo un modelo cloud-native desacoplado y **100% Serverless Scale-to-Zero**, distribuyendo cada componente (frontend, backend, tareas asíncronas, tareas programadas y base de datos) en servicios especializados que se comunican de forma segura mediante HTTPS y tokens OIDC.

---

## 1. 🌐 Topología de Despliegue Distribuida

El sistema se despliega sobre servicios independientes, optimizados para costo $0 en reposo y alta disponibilidad:

| Componente | Tecnología | Plataforma de Despliegue | Función |
|---|---|---|---|
| **Frontend (SPA)** | React 19 + Vite (build estático) | **Vercel** | Servidor de archivos estáticos con CDN global Edge. |
| **Backend (API REST)** | FastAPI + Uvicorn (Contenedor Docker) | **Google Cloud Run** | API RESTful Serverless con Scale-to-Zero (`0` a `10` instancias). |
| **Tareas Asíncronas** | Google Cloud Tasks | **GCP Cloud Tasks (`mifrufely-tasks`)** | Cola serverless con reintentos y backoff exponencial (envío de emails). |
| **Tareas Programadas** | Google Cloud Scheduler | **GCP Cloud Scheduler (OIDC Auth)** | 4 crons automáticos de expiración de lotes, cupones, ventas y analítica. |
| **Caché / Rate Limit** | In-Memory TTL + Redis Local | **Resilient Cache Client** | Memoria local en Cloud Run / Redis en Docker dev. |
| **Base de Datos** | PostgreSQL (NeonDB) | **NeonDB (Serverless)** | Persistencia ACID con auto-suspensión tras 5 min de inactividad. |
| **Imágenes / CDN** | Cloudinary API | **Cloudinary** | Almacenamiento y optimización de medios (fotos de trufas/productos). |

> 📌 **Documentación técnica detallada de GCP:** Ver [`Arquitectura_GCP_Serverless.md`](./Arquitectura_GCP_Serverless.md).

---

## 2. ⚡ Despliegue del Frontend en Vercel (Edge Network)

El frontend es una *Single Page Application* (SPA) construida con React 19 y Vite:

* **URL de Producción:** [`https://mitrufely-web.vercel.app`](https://mitrufely-web.vercel.app)
* **Build de Producción:** `npm run build` ejecuta la compilación de TypeScript (`tsc -b`) y empaquetado de Vite con *tree-shaking* y compresión GZip/Brotli.
* **Integración Continua:** Vercel se integra con la rama `master` de GitHub, generando despliegues automáticos ante cada `git push`.
* **Variables de Entorno en Vercel:**
  * `VITE_API_BASE_URL`: `https://mifrufely-backend-zwy2wghfva-uc.a.run.app/api/v1`
  * `VITE_GOOGLE_CLIENT_ID`: ID de cliente OAuth 2.0 para Google Identity Services.

---

## 3. 🚀 Despliegue del Backend en Google Cloud Run

El backend se despliega como servicio contenedorizado sin servidor utilizando una imagen Docker multi-stage optimizada:

### i. Estrategia de Contenedores (`Dockerfile`)
1. **Builder Stage (`python:3.11-slim`):** Compila dependencias C/C++ (`libpq-dev`, `build-essential`) e instala paquetes en `/install`.
2. **Production Stage:** Imagen limpia de solo 180MB que copia únicamente binarios sin herramientas de compilación, ejecutándose bajo el usuario sin privilegios `appuser` (UID no-root).
3. **Contexto optimizado (`.dockerignore`):** Excluye `.venv`, cachés y `.git`, transfiriendo solo 4MB de contexto a Docker.

### ii. Orquestación y Scale-to-Zero
* El servicio escala automáticamente a **0 instancias** cuando no hay tráfico HTTP entrante.
* Al recibir una petición, Cloud Run inicia una instancia en menos de 2 segundos.
* Al no haber instancias activas ni peticiones a NeonDB, la base de datos se suspende automáticamente, garantizando consumo nulo de cuotas de cómputo.

---

## 4. ⏰ Tareas Programadas y Asíncronas (Serverless)

En lugar de mantener un worker Celery y Redis corriendo 24/7 (lo que impediría el Scale-to-Zero), se adoptaron componentes nativos de GCP:

1. **Cloud Tasks (`mifrufely-tasks`):**
   * Desacopla el envío de correos SMTP transaccionales.
   * Maneja reintentos con backoff exponencial sin bloquear la respuesta al usuario.
2. **Cloud Scheduler:**
   * Ejecuta crons diarios y periódicos disparando llamadas HTTP seguras con tokens OIDC firmados por la Service Account `mifrufely-backend-invoker@mitrufely.iam.gserviceaccount.com`.

---

## 5. 🔑 Gestión de Secretos y Configuración

Toda la configuración se encuentra externalizada mediante [`_backEnd/gcp/env.yaml`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_backEnd/gcp/env.yaml) y leída mediante Pydantic Settings:

* `DATABASE_URL`: Cadena segura con SSL hacia NeonDB AWS us-east-1 pooler.
* `SECRET_KEY`: Llave de firmado criptográfico HS256 para JWT.
* `ALLOWED_ORIGINS`: Lista estricta que permite exclusivamente `https://mitrufely-web.vercel.app` y `http://localhost:5173`.
* `CLOUDINARY_*`: Credenciales de almacenamiento de imágenes.
* `GOOGLE_CLIENT_ID`: Identificador de aplicación para validar ID Tokens de Google Sign-In.

---

## 6. 🔄 Pipeline de Despliegue Automatizado

El despliegue se gestiona de forma reproducible con PowerShell:

```powershell
# Compilación, subida a Artifact Registry, despliegue en Cloud Run y configuración de Scheduler
.\_backEnd\gcp\deploy.ps1
```
