# VIII. Arquitectura

En esta sección se define la estructura fundamental del sistema **Mytrufely**, garantizando que el software sea escalable, mantenible y seguro. La arquitectura elegida sigue el modelo **Cliente–Servidor Desacoplado**, permitiendo que el frontend y el backend evolucionen de manera independiente.

## 1. Estilo Arquitectónico: API RESTful Desacoplada (Async-First)

El sistema se divide en dos grandes componentes que se comunican exclusivamente mediante contratos HTTP en formato JSON:

- **Frontend (React 19 + Vite + TypeScript + Tailwind CSS v4):** Encargado de la lógica de presentación, el manejo de estado en el cliente y el consumo de servicios REST. Se comunica con el backend únicamente mediante peticiones HTTP (JSON). Emplea **React Router v7** para el enrutado, **TanStack React Query** para el estado del servidor (caché y refetch) y **Zustand** para el estado síncrono del cliente (carrito, sesión).
- **Backend (Python 3.11+ – FastAPI 0.115):** Expone una API RESTful centralizada **asíncrona de punta a punta (ASGI/Uvicorn)** que contiene toda la lógica de negocio, validaciones y reglas de la empresa, aprovechando el alto rendimiento de Starlette y la validación estricta de **Pydantic v2**.

> **Comunicación asíncrona:** El backend delega las operaciones pesadas (generación de PDF/Excel, analítica, notificaciones, expiración de ventas) a una **cola de tareas Celery** con **Redis** como broker, de modo que los endpoints responden en milisegundos.

## 2. Patrones de Diseño Aplicados (Semana 9)

Para mantener el código limpio y estructurado, el backend se rige estrictamente por los siguientes patrones arquitectónicos, organizados mediante **Rebanadas Verticales (Vertical Slices)** por módulo de negocio (`app/modules/<dominio>/`):

- **Patrón MVC (Model-View-Controller) Adaptado / Arquitectura Hexagonal:**
  - **Model:** Representado por los modelos de **SQLAlchemy 2.0 (async)** y los esquemas de validación de **Pydantic v2** (`Producto`, `Lote`, `Venta`, `Usuario`, `movimientos_puntos`) que mapean la base de datos PostgreSQL.
  - **Controller:** Enrutadores de FastAPI (`APIRouter`) que reciben las peticiones HTTP, validan el payload entrante y delegan la ejecución. Son *capas delgadas* sin lógica de negocio.
  - **Service (Lógica de Negocio):** Módulos de servicios donde reside la lógica pura (ej. cálculo de SweetCoins, orquestación del checkout).
- **Patrón Repository (DAO) + Inversión de Dependencias:** Se definen **interfaces abstractas** (`AbstractRepository`) en la capa de dominio y sus **implementaciones concretas** (`SQLAlchemy<Nombre>Repository`) en la capa de infraestructura, abstrayendo por completo PostgreSQL. Esto permite realizar operaciones CRUD y consultas personalizadas sin acoplar la lógica de negocio al ORM, asegurando la integridad referencial y facilitando las pruebas.
- **Principios SOLID:** Se aplica el principio de **Responsabilidad Única (SRP)**, separando estrictamente las capas de ruteo (controladores), servicios de negocio y repositorios de datos. Asimismo, se aplica el principio de **Inversión de Dependencias (DIP)** utilizando el sistema nativo de Inyección de Dependencias (`Depends`) de FastAPI y el contenedor **dependency-injector** para desacoplar los componentes.
- **Patrones complementarios:** **Singleton** para la configuración (`settings` con `@lru_cache`), **Unit of Work** transaccional en el checkout (`async with session.begin()`) y **manejo centralizado de excepciones** de dominio (`NotFoundError`, `BusinessRuleError`, `InsufficientStockError`, etc.) traducidas a respuestas HTTP.

## 3. Consideraciones de Seguridad en la Arquitectura

Diseñado para soportar el módulo de seguridad, la arquitectura incluye middlewares y filtros de seguridad basados en **JWT (JSON Web Token)** implementados con **python-jose** y **passlib/bcrypt**. Las peticiones a endpoints administrativos (como el CRUD de productos, inventario o gestión de pedidos) requieren un token válido y verificación de roles mediante **RBAC** (`UserRole.ADMIN` / `UserRole.CLIENTE` con permisos granulares), mientras que las vistas de catálogo son de acceso público.

> **Logout real y verificación de cuenta:** El JWT se invalida de forma efectiva mediante una **lista de bloqueo (blocklist) en Redis** (con TTL calculado por el tiempo de vida restante del token). Además, el registro de clientes requiere **verificación por correo electrónico** antes de habilitar el inicio de sesión.

---

# IX. Desarrollo

En esta fase (Unidad 3 del curso), se materializó el diseño mediante la codificación del software, aplicando control de versiones y aprovechando el ecosistema de librerías de Python para optimizar la construcción de la solución.

## 1. Stack Tecnológico Implementado

| Capa | Tecnología |
|---|---|
| **Lenguaje Backend** | Python 3.11+ (con tipado estricto vía MyPy) |
| **Framework Backend** | FastAPI 0.115 (con Uvicorn como servidor ASGI) |
| **ORM y Base de Datos** | SQLAlchemy 2.0 async + asyncpg, sobre **PostgreSQL** alojado en la nube (**NeonDB**) |
| **Cola de Tareas y Caché** | **Celery + Redis** (procesamiento asíncrono de reportes, PDFs y analítica) |
| **Frontend** | **React 19 + Vite + TypeScript**, Tailwind CSS v4, Radix UI, React Router v7 |
| **Estado (Frontend)** | TanStack React Query (servidor) + Zustand (cliente) |

## 2. Recursos y Librerías (Ecosistema Python)

Para cumplir con los requerimientos de generación de reportes, manejo de datos y rendimiento, se integraron las siguientes librerías clave:

- **OpenPyXL + XlsxWriter:** Utilizadas para la exportación de reportes operativos y de inventario en formato Excel (`.xlsx`), permitiendo al administrador visualizar el estado de los lotes y movimientos de stock (Kardex) de manera tabular.
- **ReportLab + WeasyPrint:** Implementadas para la generación dinámica de comprobantes de pago y facturas en formato **PDF** cada vez que un cliente finaliza una orden de compra (ejecutadas como tareas asíncronas de Celery).
- **structlog (+ python-json-logger):** Configurado como motor de **logging estructurado en JSON** para auditar las transacciones críticas de la API, facilitar el monitoreo y capturar trazas de errores.
- **Pydantic v2:** Empleada intensivamente para la validación de datos de entrada (esquemas) y el tipado, reduciendo errores en tiempo de ejecución.
- **python-jose + passlib/bcrypt:** Autenticación basada en **JWT** y cifrado unidireccional de contraseñas.
- **dependency-injector:** Contenedor de inyección de dependencias que complementa el sistema nativo `Depends` de FastAPI.
- **Cloudinary:** Almacenamiento en la nube de imágenes de productos.

## 3. Control de Versiones (Git & GitHub) (Semana 11)

Para el trabajo colaborativo del equipo, se implementó un sistema de control de versiones distribuido:

- Se creó un repositorio centralizado en **GitHub**.
- Se adoptó la metodología de ramas **GitFlow** de forma simplificada, utilizando ramas de características (`feature/nombre-modulo`) para el desarrollo paralelo (ej. `feature/modulo-carrito`, `feature/reportes-pdf`), las cuales eran revisadas y fusionadas mediante **Pull Requests** a la rama principal (`master`).
- Se empleó la convención **Conventional Commits** (`feat:`, `fix:`, etc.) para mantener mensajes descriptivos y trazables.
- Esto garantizó la trazabilidad del código, evitando conflictos entre el equipo de Frontend y Backend.

## 4. Lógica de Negocio Desarrollada (Casos Críticos)

Durante el desarrollo se codificaron algoritmos clave para la pastelería, destacando:

- **Gestión de Inventario FEFO (First Expired, First Out):** Algoritmo de despacho de productos perecederos implementado en la capa de **datos** mediante el trigger de PostgreSQL `tg_detalles_venta_asignar_lotes`, el cual consulta los registros de lotes asociados a un producto, los ordena por fecha de vencimiento ascendente y descuenta el stock del lote más próximo a vencer, usando bloqueo pesimista (`FOR UPDATE`) para garantizar la integridad bajo concurrencia.
- **Sistema de Fidelización (SweetCoins):** Implementado como un *ledger* contable en la tabla `movimientos_puntos`, donde el saldo del cliente **se calcula** (no se almacena) mediante la función `fn_saldo_puntos_cliente`. La acumulación de puntos se dispara automáticamente al marcar una venta como `PAGADA` (trigger `tg_ventas_otorgar_puntos`, que aplica la `tasa_conversion` configurada), y los puntos pueden canjearse por cupones de descuento.

---

# X. Despliegue

En esta sección se describe la **estrategia de despliegue en la nube** del sistema Mytrufely. La solución se publica bajo un modelo **cloud-native desacoplado**, distribuyendo cada componente (frontend, backend, workers y base de datos) en servicios especializados que se comunican entre sí mediante la red pública de Internet, respetando el principio de separación de responsabilidades de la arquitectura.

## 1. Topología de Despliegue Distribuida

El sistema se despliega sobre **cuatro servicios independientes**, cada uno con un proveedor de cloud especializado en su función:

| Componente | Tecnología | Plataforma de Despliegue | Función |
|---|---|---|---|
| **Frontend (SPA)** | React 19 + Vite (build estático) | **Vercel** | Servidor de archivos estáticos con CDN global |
| **Backend (API REST)** | FastAPI + Uvicorn | **Render (Web Service)** | Servidor de aplicación ASGI con escalado horizontal |
| **Workers asíncronos** | Celery (Worker + Beat) | **Render (Background Worker)** | Procesamiento en segundo plano (PDF, Excel, analítica, expiración) |
| **Caché / Cola** | Redis | **Render (Redis)** | Broker de Celery + almacenamiento de carritos y blocklist de JWT |
| **Base de Datos** | PostgreSQL | **NeonDB (Serverless)** | Persistencia ACID transaccional con triggers y vistas |
| **Imágenes** | — | **Cloudinary** | CDN de medios (fotos de productos) |

> **Comunicación entre servicios:** El frontend consume la API del backend mediante su URL pública (`VITE_API_BASE_URL`). El backend se conecta a NeonDB, Redis y Cloudinary mediante variables de entorno inyectadas en tiempo de ejecución. Esta topología permite que cada componente escale, se actualice y se monitoree de forma independiente.

## 2. Despliegue del Frontend en Vercel (Edge Network)

El frontend es una **Single Page Application (SPA)** construida con Vite, por lo que el proceso de despliegue consiste en generar un *bundle* de archivos estáticos optimizados y publicarlos en la **red de borde (CDN) global** de Vercel.

- **Build de producción:** El comando `npm run build` ejecuta la compilación de TypeScript (`tsc -b`) y luego el empaquetado de Vite, generando artefactos estáticos en `dist/` (con *tree-shaking*, *code-splitting* y *minificación*).
- **Publicación continua:** Vercel se integra directamente con el repositorio de GitHub. Cada *push* a la rama `master` desencadena automáticamente un nuevo *build* y despliegue (*Continuous Deployment*), sirviendo la última versión en una URL pública bajo el dominio `*.vercel.app`.
- **Edge Network:** Los archivos se replican en múltiples *Points of Presence (PoP)* del mundo, de modo que el usuario recibe el contenido desde el nodo geográficamente más cercano, minimizando la latencia de carga inicial.
- **Variables de entorno:** La URL del backend se inyecta en el *bundle* en tiempo de construcción mediante la variable `VITE_API_BASE_URL`, apuntando a la API desplegada en Render.

## 3. Despliegue del Backend en Render (Contenedores Docker)

El backend se despliega como un **Web Service** en Render utilizando una **imagen Docker multi-stage** (`Dockerfile`), lo que garantiza que el entorno de producción sea idéntico al de desarrollo y evite el clásico problema de *"en mi máquina funciona"*.

### 3.1 Estrategia de Imagen Multi-Stage

El `Dockerfile` emplea **tres etapas** para optimizar el tamaño y la seguridad de la imagen final:

1. **Builder:** Instala las dependencias de `requirements.txt` en un prefijo aislado, sin arrastrar el compilador ni cachés al producto final.
2. **Development:** Incluye las herramientas de desarrollo (`requirements-dev.txt`) y se usa en local vía `docker-compose` con *hot-reload* (`--reload`).
3. **Production:** Imagen mínima basada en `python:3.11-slim` que **solo copia las dependencias y el código**, ejecutándose bajo un **usuario no privilegiado** (`appuser`) con un `HEALTHCHECK` propio, siguiendo la buenas prácticas de seguridad de contenedores.

### 3.2 Orquestación en Producción (render.yaml)

El despliegue se declara de forma **declarativa e infraestructura-como-código** mediante el archivo `render.yaml`:

- **Web Service (FastAPI):** Se ejecuta con `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2`, donde `$PORT` lo inyecta Render dinámicamente. Dispone de un **Health Check** en `/api/v1/health` que Render consulta periódicamente para determinar la disponibilidad del servicio.
- **Background Worker (Celery):** Ejecuta el *worker* y el *beat scheduler* en procesos independientes. Se encarga de las tareas pesadas (generación de reportes PDF/Excel, agregación de analítica, notificaciones y **expiración automática de ventas pendientes**), desacoplando estos procesos del hilo principal de la API.
- **Redis (broker/caché):** Servicio gestionado por Render, con política `allkeys-lru`, accesible únicamente desde la red interna de Render (`ipAllowList: []`), usado tanto como broker de Celery como para el almacenamiento del **carrito persistente** y la **blocklist de tokens JWT**.
- **Despliegue continuo:** Render se vincula con GitHub y reconstruye la imagen automáticamente ante cada *commit* en `master` (`autoDeploy: true`).

## 4. Gestión de Configuración y Secretos

Ningún secreto vive en el repositorio. Toda la configuración sensible se administra mediante **variables de entorno** inyectadas en tiempo de ejecución desde el panel de cada proveedor:

| Variable | Propósito |
|---|---|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL (NeonDB) — marcada como *secret* |
| `SECRET_KEY` | Clave de firma de los JWT — autogenerada por Render |
| `REDIS_URL` | Conexión al Redis interno — provista automáticamente por el servicio |
| `APP_ENV` / `DEBUG` | Modo de ejecución (`production` / `false`) |
| `VITE_API_BASE_URL` | URL pública del backend, inyectada en el *bundle* del frontend |
| `CLOUDINARY_*` | Credenciales del CDN de imágenes |

En el backend, estas variables se leen de forma centralizada y tipada mediante **Pydantic Settings** (con el patrón **Singleton** vía `@lru_cache`), validando su presencia y formato al arrancar la aplicación y fallando de forma temprana (*fail-fast*) si alguna es inválida.

## 5. Microservicio de Entregas (Delivery Service)

El sistema incluye un **microservicio independiente** (`_deliveryService`) encargado de **simular el proceso de preparación y tránsito** de los pedidos:

- Se ejecuta como un servicio FastAPI aislado (puerto `8001`), exponiendo `POST /deliveries` para iniciar una entrega y `GET /deliveries/{id}` para consultar su estado.
- Tras simular la preparación y el tránsito (con retardos configurables), **notifica al backend** mediante un *webhook* firmado (`x-delivery-token`) hacia `/api/v1/ventas/{id}/delivery-completed`, aplicando **reintentos con backoff exponencial** ante fallos transitorios de red.
- Este desacoplamiento permite que la lógica de entregas evolucione (o se sustituya por una pasarela de envíos real) sin afectar al backend principal.

## 6. Estrategia CI/CD y Pipeline de Liberación

El proyecto adopta un flujo **GitOps** de despliegue continuo, donde el estado deseado del sistema vive en el propio repositorio:

```
   git push (master)
        │
        ▼
   ┌─────────────────┐
   │   GitHub (src)  │
   └────────┬────────┘
            │ webhook
   ┌────────┴────────┐
   ▼                 ▼
┌────────┐      ┌────────────────────┐
│ Vercel │      │       Render       │
│ (FE)   │      │ build Docker image │
└────────┘      │  ┌───────┐ ┌─────┐ │
                │  │ API   │ │Work.│ │
                │  └───────┘ └─────┘ │
                │       │            │
                │   ┌───┴───┐        │
                │   │ Redis │        │
                │   └───────┘        │
                └────────────────────┘
```

1. **Commit en `master`:** Tras la revisión vía *Pull Request*, el código fusionado desencadena los webhooks de ambos proveedores.
2. **Build paralelo:** Vercel compila el frontend estático; Render construye la imagen Docker del backend.
3. **Health Check:** Render solo enruta tráfico al nuevo despliegue cuando el endpoint `/api/v1/health` responde correctamente, garantizando *zero-downtime*.
4. **Rollback:** Ambas plataformas conservan el historial de despliegues, permitiendo revertir a una versión anterior ante una regresión.

## 7. Consideraciones de los Planes Free y Escalabilidad

El despliegue se realiza sobre los **planes gratuitos** de Vercel y Render, lo que impone ciertas restricciones que la arquitectura mitiga deliberadamente:

- **Render Free (Web Service):** El servicio puede entrar en estado *idle* (suspensión) tras periodos de inactividad. La arquitectura asíncrona y los *workers* de Celery permiten que el primer request tras reactivarse se sirva correctamente tras un breve arranque.
- **NeonDB (Serverless):** La base de datos también escala a cero en inactividad; el *pool* de conexiones de SQLAlchemy (`asyncpg`) maneja reconexiones transparentes.
- **Vercel Hobby:** Límite de ancho de banda adecuado para un alcance académico/demo, con CDN que reduce la carga sobre el origen.
- **Escalado horizontal futuro:** Al estar cada componente desacoplado (frontend estático, API stateless, workers independientes, Redis y base de datos gestionados), el sistema puede crecer vertical u horizontalmente sin refactorizar el código, simplemente ajustando el plan de cada servicio.
