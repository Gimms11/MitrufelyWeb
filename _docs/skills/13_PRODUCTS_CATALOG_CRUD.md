# Skill: CRUD de Productos, Categorías y Catálogo (Módulo M03)

## 1. Contexto

El CRUD de productos (ubicado en `app/modules/products/`) y categorías (ubicado en `app/modules/categories/`) no es un CRUD convencional. Sigue un patrón estricto diseñado para mantener la integridad con el inventario, los paquetes comerciales y el almacenamiento de imágenes externas (Cloudinary).

## 2. Reglas Arquitectónicas Críticas

### 2.1. CRUD de Categorías (`app/modules/categories/`)

Las categorías siguen el mismo patrón arquitectónico de 5 archivos que el resto de módulos:

```
app/modules/categories/
├── router.py          # 5 endpoints en /api/v1/categorias
├── service.py         # CategoriaService — validaciones, reglas de negocio, slug
├── repository.py      # ICategoriaRepository (interfaz abstracta)
├── repository_impl.py # CategoriaRepositoryImpl (SQLAlchemy async + python-slugify)
├── schemas.py         # Pydantic: CategoriaCreate, CategoriaUpdate, CategoriaResponse
└── dependencies.py    # DI: get_categoria_repository → get_categoria_service
```

**Validaciones de Categoría:**
- **Nombre:** Obligatorio, 2-100 caracteres, único, sin espacios al inicio/final. Validado con Pydantic `field_validator`.
- **Slug:** Generado automáticamente con `python-slugify`. Único (con sufijos incrementales si hay colisión: `nombre-2`, `nombre-3`). Se regenera al actualizar el nombre.
- **Estado:** `True` (activo) o `False` (soft delete). Los endpoints públicos solo retornan categorías con `estado=True`.

**Reglas de negocio antes del Delete:**
- Verificar `has_productos()` — si hay productos con ese `id_categoria`, rechazar con `BusinessRuleError` (422).
- Verificar `has_cupones_maestro()` — si hay cupones asociados, rechazar con `BusinessRuleError` (422).
- Solo si ambas verificaciones pasan, se aplica soft delete (`estado=False`).

**Dependencias FK:**
- `productos.id_categoria` → FK `ON DELETE RESTRICT`
- `cupones_maestro.id_categoria` → FK `ON DELETE RESTRICT`

### 2.2. Disponibilidad Comercial vs Estado Administrativo
- **`estado` (bool):** Es el soft delete. Un producto con `estado=False` está eliminado lógicamente. **NUNCA** elimines un producto físicamente.
- **`disponible` (bool):** Se calcula **en tiempo real** en el Pydantic Response (`ProductoResponse` y `PaqueteResponse`).
  - *Regla:* Un producto es `disponible=True` SOLO SI `estado == True` AND `stock_actual > 0`.
  - *Impacto en Paquetes:* Si un producto pasa a no estar disponible, todos los paquetes que lo contienen también pasan a estar indisponibles de manera automática, sin intervención del backend ni base de datos, simplemente se evalúa en `PaqueteService._calc_disponible()`.

### 2.3. Manejo de Imágenes (Cloudinary)
- Los endpoints `POST` y `PUT` reciben `multipart/form-data`.
- **Patrón de Rollback:**
  - Se sube la imagen a Cloudinary (obteniendo el `public_id`).
  - Se inserta en Base de Datos.
  - **Excepción en DB:** Si la DB arroja error (ej. constraint de unicidad), el bloque `except Exception as e:` debe llamar a `await storage_service.delete_image(uploaded_public_id)` para evitar imágenes huérfanas en Cloudinary.
- **Patrón de Reemplazo:** Al hacer `PUT` con una imagen nueva, **solo si el commit es exitoso** se elimina la imagen antigua (`old_public_id`) de Cloudinary.

### 2.4. Auto-Slug
- El frontend **nunca** envía el `slug`.
- El backend (`ProductoRepositoryImpl.generate_unique_slug()`) genera el slug normalizando el `nombre`. Si existe colisión, añade sufijos incrementales (`trufa-oreo-2`).

### 2.5. Constraints de Unicidad
- **`slug`:** Constraint `UNIQUE` a nivel de base de datos.
- **`nombre`:** Partial Index UNIQUE: `CREATE UNIQUE INDEX uq_producto_activo_nombre ON productos (nombre) WHERE estado = true;`. Esto permite que haya un producto "Trufa Oreo" eliminado (`estado=False`) y se pueda crear uno nuevo con el mismo nombre.

### 2.6. Paginación
Todas las listas del catálogo devuelven un genérico `PaginatedResponse[T]`:
```json
{
  "items": [{...}],
  "page": 1,
  "size": 20,
  "total": 120,
  "pages": 6
}
```

## 3. Ejemplo de Uso de Service

```python
# Ejemplo de rollback nativo en ProductoService
try:
    if image_file:
        upload_res = await storage_service.upload_image(file_bytes=..., folder="mitrufely/products")
        uploaded_public_id = upload_res["public_id"]
    
    # Intento de inserción en DB
    producto_creado = await self.repo.create(nuevo_producto)
    return self._map_to_response(producto_creado)
    
except Exception as e:
    # ROLLBACK EXTERNO
    if uploaded_public_id:
        await storage_service.delete_image(uploaded_public_id)
    raise e
```
