# 📦 Dependencias y Librerías — MitrufelyWeb

Proyecto: **MitrufelyWeb** · Curso: Integrador de Sistemas · UTP Ciclo 6

---

## 🖥️ FRONTEND — React + TypeScript + Vite

> Archivo de referencia: [`package.json`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_frontEnd/package.json)

### ⚙️ Core Framework

| Librería | Versión | Propósito |
|---|---|---|
| `react` | ^19.2.6 | Librería principal para construir interfaces de usuario basadas en componentes |
| `react-dom` | ^19.2.6 | Renderizado de React en el navegador (DOM) |
| `react-router` | ^7.6.1 | Enrutamiento del lado del cliente (SPA navigation) |
| `typescript` | ~6.0.2 | Tipado estático sobre JavaScript para mayor robustez y mantenibilidad |
| `vite` | ^8.0.12 | Build tool y servidor de desarrollo ultrarrápido (reemplaza Webpack) |

---

### 🎨 Estilos y UI

| Librería | Versión | Propósito |
|---|---|---|
| `tailwindcss` | ^4.3.0 | Framework de utilidades CSS para diseño rápido y consistente |
| `@tailwindcss/vite` | ^4.3.0 | Plugin de integración de TailwindCSS con Vite |
| `tailwind-merge` | ^3.3.0 | Combina clases de Tailwind sin conflictos en tiempo de ejecución |
| `tailwindcss-animate` | ^1.0.7 | Plugin de animaciones CSS para TailwindCSS |
| `class-variance-authority` | ^0.7.1 | Gestión de variantes de componentes UI (base de ShadCN) |
| `clsx` | ^2.1.1 | Utilidad para construir `className` condicionales de forma limpia |
| `lucide-react` | ^0.511.0 | Biblioteca de iconos SVG modernos y accesibles |
| `framer-motion` | ^12.15.0 | Animaciones y transiciones declarativas de alto nivel |

---

### 🧩 Componentes Primitivos (Radix UI)

| Librería | Versión | Propósito |
|---|---|---|
| `@radix-ui/react-dialog` | ^1.1.14 | Componente modal/diálogo accesible (WAI-ARIA compliant) |
| `@radix-ui/react-dropdown-menu` | ^2.1.15 | Menú desplegable accesible |
| `@radix-ui/react-slot` | ^1.2.3 | Primitiva de composición de componentes (Slot pattern) |
| `@radix-ui/react-tabs` | ^1.1.12 | Componente de pestañas accesible |

> **Radix UI** provee la base de accesibilidad (ARIA, keyboard navigation) sin imponer estilos, siguiendo el principio de *separation of concerns*.

---

### 🔄 Estado y Peticiones HTTP

| Librería | Versión | Propósito |
|---|---|---|
| `@tanstack/react-query` | ^5.80.5 | Gestión de estado del servidor: caché, sincronización, revalidación automática |
| `axios` | ^1.9.0 | Cliente HTTP con interceptores para llamadas a la API REST del backend |
| `zustand` | ^5.0.5 | Gestión de estado global del cliente (ligero, sin boilerplate) |
| `immer` | ^11.1.8 | Mutaciones inmutables del estado (integrado con Zustand) |

---

### 📋 Formularios y Validación

| Librería | Versión | Propósito |
|---|---|---|
| `react-hook-form` | ^7.56.4 | Gestión de formularios con mínimas re-renders (performante) |
| `@hookform/resolvers` | ^5.0.1 | Adaptadores para conectar validadores externos con React Hook Form |
| `zod` | ^3.24.4 | Validación y parseo de esquemas con tipado TypeScript end-to-end |

---

### 📊 Datos y Reportes

| Librería | Versión | Propósito |
|---|---|---|
| `@tanstack/react-table` | ^8.21.3 | Motor headless para tablas de datos complejas (sort, filter, pagination) |
| `recharts` | ^2.15.3 | Gráficos y visualizaciones de datos basados en SVG para el dashboard |
| `exceljs` | ^4.4.0 | Generación y exportación de archivos Excel (.xlsx) desde el navegador |
| `jspdf` | ^4.2.1 | Generación y exportación de documentos PDF en el cliente |
| `date-fns` | ^4.1.0 | Manipulación y formateo de fechas de forma funcional e inmutable |

---

### 🔔 Notificaciones

| Librería | Versión | Propósito |
|---|---|---|
| `sonner` | ^2.0.3 | Toast notifications (notificaciones emergentes) accesibles y animadas |

---

### 🛠️ Herramientas de Desarrollo (devDependencies)

| Librería | Propósito |
|---|---|
| `eslint` + plugins | Análisis estático de código para detectar errores y malas prácticas |
| `prettier` | Formateo automático de código para mantener consistencia |
| `husky` | Hooks de Git (pre-commit) para ejecutar lint/format antes de cada commit |
| `lint-staged` | Ejecuta linters solo sobre los archivos modificados en el staging area |
| `@tanstack/react-query-devtools` | Panel de depuración del estado del servidor en desarrollo |
| `babel-plugin-react-compiler` | Optimización automática de re-renders con el compilador experimental de React |

---

---

## 🐍 BACKEND — FastAPI + Python 3.11+

> Archivos de referencia: [`requirements.txt`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_backEnd/requirements.txt) · [`requirements-dev.txt`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_backEnd/requirements-dev.txt)

### ⚙️ Framework Principal

| Librería | Versión | Propósito |
|---|---|---|
| `fastapi` | 0.115.12 | Framework web asíncrono de alto rendimiento para construir APIs REST |
| `uvicorn[standard]` | 0.34.2 | Servidor ASGI (Asynchronous Server Gateway Interface) para ejecutar FastAPI |
| `python-multipart` | 0.0.20 | Soporte para recepción de formularios y subida de archivos multipart |

---

### 🗄️ Base de Datos

| Librería | Versión | Propósito |
|---|---|---|
| `sqlalchemy` | 2.0.41 | ORM (Object-Relational Mapper) para interactuar con PostgreSQL mediante objetos Python |
| `asyncpg` | 0.30.0 | Driver PostgreSQL asíncrono de muy alto rendimiento |
| `psycopg[binary,pool]` | 3.2.9 | Driver PostgreSQL con soporte de connection pooling |
| `greenlet` | 3.2.2 | Soporte de concurrencia liviana requerido por SQLAlchemy async |

> El proyecto usa **PostgreSQL** como motor de base de datos relacional.

---

### ✅ Validación de Datos (Pydantic V2)

| Librería | Versión | Propósito |
|---|---|---|
| `pydantic` | 2.11.5 | Validación de datos y serialización/deserialización con tipado estricto |
| `pydantic-settings` | 2.9.1 | Gestión de configuración y variables de entorno (.env) con tipado |
| `pydantic-extra-types` | 2.10.3 | Tipos adicionales (PhoneNumber, Color, etc.) para validación avanzada |
| `email-validator` | 2.2.0 | Validación robusta de correos electrónicos (requerido por Pydantic) |

---

### 🔐 Seguridad y Autenticación

| Librería | Versión | Propósito |
|---|---|---|
| `python-jose[cryptography]` | 3.3.0 | Generación y verificación de tokens JWT (JSON Web Tokens) |
| `passlib[bcrypt]` | 1.7.4 | Hashing seguro de contraseñas |
| `cryptography` | 45.0.3 | Criptografía de bajo nivel (cifrado, firmas, certificados) |
| `bcrypt` | 4.3.0 | Algoritmo de hashing adaptativo para contraseñas |

---

### 🌐 Cliente HTTP

| Librería | Versión | Propósito |
|---|---|---|
| `httpx` | 0.28.1 | Cliente HTTP asíncrono (usado en tests y para llamadas a APIs externas) |

---

### ⚡ Caché y Tareas en Background

| Librería | Versión | Propósito |
|---|---|---|
| `redis` | 5.3.0 | Cliente de Redis para caché y lista de tokens revocados (JWT blocklist) |
| `celery[redis]` | 5.5.2 | Cola de tareas asíncronas distribuidas (envío de emails, reportes, etc.) |
| `kombu` | 5.5.2 | Librería de mensajería que usa Celery como transport layer |

---

### 📄 Generación de Documentos

| Librería | Versión | Propósito |
|---|---|---|
| `reportlab` | 4.4.1 | Generación de PDFs programáticamente en el servidor |
| `weasyprint` | 65.1 | Conversión de HTML/CSS a PDF |
| `openpyxl` | 3.1.5 | Lectura y escritura de archivos Excel (.xlsx) |
| `xlsxwriter` | 3.2.3 | Generación avanzada de archivos Excel con formatos y gráficos |

---

### 📝 Logging y Observabilidad

| Librería | Versión | Propósito |
|---|---|---|
| `structlog` | 25.3.0 | Logging estructurado (JSON) para sistemas en producción |
| `python-json-logger` | 3.3.0 | Formatter de logs en formato JSON para integración con herramientas externas |
| `prometheus-fastapi-instrumentator` | 7.1.0 | Exposición automática de métricas Prometheus para monitoreo |

---

### 🧱 Arquitectura

| Librería | Versión | Propósito |
|---|---|---|
| `dependency-injector` | 4.46.0 | Contenedor de Inyección de Dependencias (patrón DI) para desacoplar servicios |

---

### 🔧 Utilidades

| Librería | Versión | Propósito |
|---|---|---|
| `python-dateutil` | 2.9.0 | Manejo avanzado de fechas y zonas horarias |
| `pytz` | 2025.2 | Conversión entre zonas horarias (ej: America/Lima) |
| `orjson` | 3.10.18 | Serialización JSON ultrarrápida (10x más veloz que `json` estándar) |
| `ujson` | 5.10.0 | JSON rápido alternativo para casos de uso específicos |
| `tenacity` | 9.1.2 | Reintentos automáticos con backoff exponencial para operaciones fallidas |
| `python-slugify` | 8.0.4 | Generación de slugs URL-friendly desde texto |
| `Pillow` | 11.2.1 | Procesamiento y manipulación de imágenes |

---

### 🧪 Dependencias de Testing (requirements-dev.txt)

| Librería | Versión | Propósito |
|---|---|---|
| `pytest` | 8.4.0 | Framework de testing principal para Python |
| `pytest-asyncio` | 0.26.0 | Soporte para tests asíncronos (async/await) con pytest |
| `pytest-cov` | 6.1.0 | Reporte de cobertura de código en tests |
| `pytest-mock` | 3.14.0 | Mocking y stubbing de objetos en tests |
| `anyio` | 4.9.0 | Compatibilidad entre backends async (asyncio, trio) |
| `faker` | 37.3.0 | Generación de datos falsos realistas para tests |
| `factory-boy` | 3.3.3 | Factories de objetos para crear datos de prueba estructurados |

---

### 🔎 Herramientas de Calidad de Código

| Herramienta | Propósito |
|---|---|
| `ruff` | Linter y formatter ultrarrápido para Python (reemplaza flake8 + isort) |
| `black` | Formateador de código Python con estilo opinionado |
| `mypy` | Verificación estática de tipos en Python |
| `pre-commit` | Ejecuta checks de calidad automáticamente antes de cada commit |

---

## 🗃️ Base de Datos

> Motor: **PostgreSQL** · Modelos en [`_modelBD/`](file:///c:/Users/lordm/Desktop/Proyectos%20y%20clases/UTP%20CICLO%206/Integrador%20de%20Sistemas/proyecto/MitrufelyWeb/_modelBD)

El proyecto utiliza PostgreSQL como única base de datos relacional. La estructura está dividida en módulos SQL (ver `_docs/sql_modules/`):

| Módulo | Descripción |
|---|---|
| `M01` — ENUMs y Tipos | Tipos enumerados compartidos (roles, estados, etc.) |
| `M02` — Usuarios y Roles | Tabla de usuarios, roles y permisos |
| `M03` — Catálogo e Inventario | Productos, categorías y control de stock (Kardex) |
| `M04` — Cupones | Sistema de cupones de descuento |
| `M05` — Ventas y Pagos | Órdenes, comprobantes y procesamiento de pagos |
| `M06` — CriptoTrufas | Sistema de recompensas (moneda interna del proyecto) |

---

## 🐳 Infraestructura y Despliegue

| Tecnología | Propósito |
|---|---|
| **Docker** + `docker-compose.yml` | Contenerización del backend, PostgreSQL y Redis para desarrollo local |
| **Render** (`render.yaml`) | Plataforma de despliegue en la nube (hosting del backend en producción) |

---

## 📊 Resumen por Conteo

| Categoría | Cantidad |
|---|---|
| Frontend — Dependencias de producción | 28 |
| Frontend — Dependencias de desarrollo | 14 |
| Backend — Dependencias de producción | 34 |
| Backend — Dependencias de desarrollo/testing | 16 |
| **Total de librerías** | **~92** |
