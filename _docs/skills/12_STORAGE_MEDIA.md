# Skill 12: Gestión de Almacenamiento y Contenido Multimedia (Cloudinary)

Este documento detalla las directrices, diseño técnico y mejores prácticas de ingeniería para la gestión de recursos multimedia, optimización en memoria e integración con el servicio en la nube **Cloudinary** en el backend de FastAPI.

---

## 1. Visión General

MitrufelyWeb utiliza **Cloudinary** como su CDN y almacenamiento centralizado para imágenes de productos, paquetes comerciales, banners promocionales y avatares de usuario. 

Para garantizar un rendimiento móvil sobresaliente, una seguridad binaria impenetrable y la consistencia transaccional del sistema, implementamos un servicio de almacenamiento desacoplado apoyado en **Pillow** para procesamiento en memoria previo a la subida.

```
                  [ Archivo Multipart ]
                            ↓
                    [ CloudinaryService ]
                            ↓
                [ Validación de Tamaño 5MB ]
                            ↓
              [ Validación MIME + Pillow.open() ]
                            ↓
            [ Optimización WebP (Alpha / Lanczos) ]
                            ↓
               [ Generar public_id (UUID4) ]
                            ↓
                  [ Subida a Cloudinary ]
                  ↙                   ↘
             [ Éxito ]              [ Fallo BD ]
                ↓                        ↓
         [ Commit en BD ]       [ Rollback Cloudinary ]
```

---

## 2. Configuración del Entorno y Seguridad

El servicio lee sus variables desde la configuración unificada de Pydantic v2 en `app/core/config.py`:

```env
# --- CLOUDINARY ---
CLOUDINARY_CLOUD_NAME=nombre_de_tu_cuenta
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### Reglas de Seguridad y Arranque:
1. **Fallback Mock Mode**: En entornos locales (`development`) y de pruebas (`testing`), si faltan las variables de entorno de Cloudinary, el servicio se iniciará automáticamente en **Mock Mode** (simulado). En lugar de fallar, registrará un aviso y devolverá URLs seguras generadas localmente (`https://res.cloudinary.com/dummy/...`).
2. **Protección Mandatoria en Producción**: Si el backend se inicia en `production` (`APP_ENV=production`) y falta alguna de las tres variables, el sistema lanzará un **ValueError fatal** y detendrá el proceso de arranque, impidiendo operar a ciegas sin almacenamiento multimedia de verdad.

---

## 3. Políticas de Validación e Integridad Binaria

Antes de tocar cualquier API externa o cargar recursos pesados, el sistema ejecuta una doble validación de seguridad de alto nivel:

1. **Límite Estricto de Tamaño**: La variable `MAX_FILE_SIZE = 5 * 1024 * 1024` (5 MB) frena cualquier payload excesivo. Si la subida excede este límite, el router responde inmediatamente con un error `413 Request Entity Too Large`.
2. **Validación MIME**: Se restringen los archivos binarios exclusivamente a un conjunto seguro: `image/jpeg`, `image/png`, `image/webp`.
3. **Validación de Integridad con Pillow**: Para impedir ataques de camuflaje de código malicioso (ej. scripts PHP/EXE renombrados como `.jpg`), la imagen se procesa con `Image.open()` y se ejecuta `image.verify()`. Si Pillow no logra decodificar la cabecera binaria, el archivo es rechazado de inmediato con `400 Bad Request`.

---

## 4. Pipeline de Optimización Multimedia

Las imágenes subidas a través del backend son procesadas 100% en memoria antes de la subida para ahorrar transferencia de datos y costos de CDN.

### 4.1. Preservación del Canal Alpha (Transparencia)
Para evitar corromper o añadir fondos negros a los PNG/WebP con fondos transparentes creados por diseñadores:
- El sistema evalúa el modo cromático original:
  ```python
  if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
      image = image.convert("RGBA")  # Mantiene transparencia
  else:
      image = image.convert("RGB")   # Convierte a RGB sin canal alfa
  ```

### 4.2. Redimensionado Proporcional (Max 800px)
Cualquier imagen con dimensiones exageradas se escala de forma proporcional con un máximo de **800x800 píxeles** de resolución mediante la función `Image.Resampling.LANCZOS`, garantizando una compresión de alta calidad óptica y bajo consumo en caché de renderizado.

### 4.3. Formato WebP Standard
Todas las imágenes se convierten nativamente a formato **WEBP** comprimidas a una calidad del `85%`, optimizando el consumo de red en dispositivos móviles en hasta un `70%` en comparación con JPEG/PNG tradicionales.

---

## 5. Prevención de Colisiones y Segregación de Directorios

1. **UUIDv4 único**: Para evitar colisiones de nombres (`trufa.webp` pisando otra `trufa.webp`), los nombres de recursos en Cloudinary se generan combinando un UUIDv4 hexadecimal de forma: `paquete_7c3a812ba...` o `producto_a12fdc98b...`.
2. **Segregación de Directorios**: El backend segmenta en carpetas organizadas desde el inicio:
   - `mitrufely/products/`
   - `mitrufely/packages/`
   - `mitrufely/banners/`
   - `mitrufely/users/`

---

## 6. Transaccionalidad Atómica y Rollback de Almacenamiento

El mayor riesgo en sistemas que integran APIs de almacenamiento externas es dejar archivos basura (**imágenes huérfanas**) en la nube si la base de datos local falla tras una subida exitosa.

Para solucionar esto, MitrufelyWeb implementa el patrón **Cloudinary Rollback / Consistency Eventual**:

### 6.1. Flujo de Creación de Paquetes
```python
uploaded_public_id = None
try:
    # 1. Subir primero la imagen física a Cloudinary
    if image_file:
        upload_res = await storage_service.upload_image(...)
        uploaded_public_id = upload_res["public_id"]
        dto.imagen_url = upload_res["secure_url"]

    # 2. Intentar guardar en base de datos local
    nuevo_paquete = Paquete(...)
    await repo.create(nuevo_paquete) # SQLAlchemy ejecuta la query/flush
    
except Exception as e:
    # 3. ROLLBACK: Si la BD falló, eliminar de inmediato el archivo de Cloudinary
    if uploaded_public_id:
        await storage_service.delete_image(uploaded_public_id)
    raise e
```

### 6.2. Flujo de Edición y Reemplazo de Imágenes
Al editar un producto o paquete con una nueva imagen, para no dejar la foto vieja huérfana en Cloudinary:
1. Subir la **nueva imagen** de forma exitosa a Cloudinary.
2. Guardar las nuevas columnas `imagen_url` y `cloudinary_public_id` en la BD local.
3. Confirmar la transacción (`commit()`).
4. **Solo tras el commit exitoso**, el servicio llama a `delete_image()` asíncronamente con el `cloudinary_public_id` **anterior**, manteniendo el CDN limpio sin riesgos de perder fotos en fallos de red previos al commit.

### 6.3. Soft Delete condicional
Si se invoca un borrado lógico (`estado = False`), la imagen **no se elimina** de Cloudinary (ya que compras históricas o facturas necesitan la referencia visual). La eliminación en Cloudinary solo ocurre ante borrados físicos destructivos (`hard delete`).

---

## 7. Referencia de API y Clases

### 7.1. Clase `CloudinaryService`
Definida en `app/infrastructure/storage/cloudinary_service.py`. Expone:
- `async def upload_image(file_bytes: bytes, filename: str, content_type: str, folder: str) -> dict`: Optimiza con Pillow en un hilo secundario y sube de forma no bloqueante a Cloudinary. Retorna `{"secure_url", "public_id"}`.
- `async def delete_image(public_id: str) -> None`: Elimina de manera asíncrona un archivo en Cloudinary mediante su ID público.

### 7.2. Endpoints
- `POST /api/v1/storage/upload` [ADMIN]: Endpoint de uso general para subir imágenes CMS y banners WYSIWYG.
- `POST /api/v1/packages` [ADMIN]: Creación de paquetes vía `multipart/form-data` con carga directa y rollback atómico.
- `PUT /api/v1/packages/{id}` [ADMIN]: Edición de paquetes vía `multipart/form-data` con reemplazo seguro de imagen y rollback de Cloudinary.
