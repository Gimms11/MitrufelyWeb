# Skill: Manejo de Loaders y Transiciones de Estado (Frontend)

## 1. Contexto

En aplicaciones SPA modernas (como el frontend de Mytrufely, construido con React + TanStack Query), la experiencia de usuario (UX) depende críticamente de la percepción de velocidad. Si un usuario realiza una acción de filtrado, cambio de categoría, búsqueda o paginación y la pantalla no cambia inmediatamente de forma clara, la aplicación se sentirá **congelada** o **lenta**, provocando clics repetidos y frustración.

Este documento establece las directrices y patrones obligatorios para manejar estados de carga y transiciones visuales en el frontend de Mytrufely.

---

## 2. Patrones de Carga en TanStack Query

Cuando consultamos endpoints paginados o filtrados desde el backend, solemos configurar la opción `placeholderData: (prev) => prev` (anteriormente `keepPreviousData: true`). 
Esto previene que la pantalla parpadee o quede totalmente vacía al cambiar de parámetros, pero **deja visible el contenido anterior**. Si no controlamos esto adecuadamente, el usuario verá la lista anterior inmóvil durante la petición de red, dando la sensación de bloqueo.

### 2.1. El Rol de `isPlaceholderData`

* **`isLoading` / `isPending`:** Solo es `true` cuando se realiza la primera petición de red y no existe absolutamente ningún dato en la caché.
* **`isPlaceholderData`:** Es `true` cuando la consulta actual está trayendo nuevos datos para una nueva clave (`queryKey`), pero la caché aún está mostrando los datos del parámetro anterior como "placeholder".

### 2.2. Implementación de Loader en Consultas Dinámicas (Ej. Catálogo en Home)

Cuando una categoría se consulta directamente al servidor al hacer clic, debemos combinar `isLoading` con `isPlaceholderData` para disparar el spinner de carga:

```tsx
// 1. Ejecutar query con placeholderData configurado
const { 
  data: productsRes, 
  isLoading, 
  isPlaceholderData 
} = useActiveProducts({ categoria: activeCategory })

// 2. Evaluar el estado de carga real para la transición
const shouldShowLoader = isLoading || isPlaceholderData

// 3. Renderizar el estado de carga
if (shouldShowLoader) {
  return <delicias-loader />
}
```

---

## 3. Patrones de Carga en Filtrado Client-Side (Local)

En pantallas donde todos los datos se descargan al inicio (por ejemplo, el catálogo general que descarga hasta 100 productos de golpe) y el filtrado se realiza localmente mediante `useMemo` en el navegador, el cambio es instantáneo. 

Sin embargo, los cambios instantáneos y sin transiciones pueden verse toscos y dar una sensación de parpadeo crudo o "congelamiento" si la lista cambia radicalmente.

### 3.1. Retardo Artificial de Transición (Transition Loader)

Para proveer una excelente respuesta visual que emule el comportamiento de red, debemos añadir un **estado de transición artificial breve** (de `300ms`) al cambiar los criterios de filtrado locales:

```tsx
// 1. Leer filtros y paginación locales
const { filters, sortBy, pagination } = useCatalogStore()
const [isTransitioning, setIsTransitioning] = useState(false)

// 2. Reactivar el loader por 300ms al cambiar cualquier filtro relevante
useEffect(() => {
  setIsTransitioning(true)
  const timer = setTimeout(() => {
    setIsTransitioning(false)
  }, 300)
  
  return () => clearTimeout(timer)
}, [filters, sortBy, pagination.page])

// 3. Pasar el estado de carga combinado al grid de productos
return (
  <ProductGrid
    products={filteredProducts}
    isLoading={isLoading || isTransitioning}
  />
)
```

Este retardo de `300ms` es el punto dulce (*sweet spot*): es lo suficientemente rápido para no ralentizar al usuario, pero lo suficientemente visible como para renderizar los skeletons y dar retroalimentación de que la acción de filtrado ocurrió con éxito.

---

## 4. Estética del Loader

Todos los loaders deben seguir el sistema de diseño de Mytrufely:

1. **Skeleton Loaders (Preferidos para Grillas):** 
   Deben simular la forma tridimensional de las tarjetas (`ProductCard`) usando animaciones de pulso (`animate-pulse`) en tonos grises o crema claros (`bg-stone-200` o `bg-stone-100`).
2. **Spinner Loaders (Preferidos para Áreas de Texto o Listas Cortas):**
   Usar un spinner giratorio con el color principal de la marca (`#5c0f1b`) y una transición suave:
   ```tsx
   <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#5c0f1b] border-t-transparent" />
   ```
