/**
 * catalog.store.ts — Estado global del Catálogo de Productos (SIAM)
 *
 * Gestiona:
 *   - Filtros: categoría, ingrediente (texto libre), alérgenos, precio, disponibilidad
 *   - Ordenamiento
 *   - Paginación
 *   - Estado del Modal
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Producto } from '@/features/products/types'

// ─── Tipos de filtros ────────────────────────────────────────────────────────

export type AllergenMode = 'exclude' | 'only'

export type SortOption =
  | 'recent'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'

export interface PriceRange {
  min: number
  max: number
}

export interface CatalogFilters {
  categoryId: number | null
  ingredientSearch: string
  allergenText: string
  allergenMode: AllergenMode
  priceRange: PriceRange
  soloDisponibles: boolean
}

export interface CatalogPagination {
  page: number
  size: number
}

export interface CatalogModal {
  isOpen: boolean
  selectedProduct: Producto | null
}

// ─── Valores por defecto ─────────────────────────────────────────────────────

const DEFAULT_FILTERS: CatalogFilters = {
  categoryId: null,
  ingredientSearch: '',
  allergenText: '',
  allergenMode: 'exclude',
  priceRange: { min: 0, max: 999 },
  soloDisponibles: false,
}

const DEFAULT_PAGINATION: CatalogPagination = {
  page: 1,
  size: 8,
}

const DEFAULT_MODAL: CatalogModal = {
  isOpen: false,
  selectedProduct: null,
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface CatalogState {
  filters: CatalogFilters
  pagination: CatalogPagination
  modal: CatalogModal
  sortBy: SortOption
}

interface CatalogActions {
  setCategoryFilter: (categoryId: number | null) => void
  setIngredientSearch: (text: string) => void
  setAllergenFilter: (text: string, mode: AllergenMode) => void
  setPriceRange: (range: PriceRange) => void
  setSoloDisponibles: (value: boolean) => void
  setSortBy: (sort: SortOption) => void
  resetFilters: () => void

  setPage: (page: number) => void
  setPageSize: (size: number) => void

  openModal: (product: Producto) => void
  closeModal: () => void
}

type CatalogStore = CatalogState & CatalogActions

export const useCatalogStore = create<CatalogStore>()(
  immer((set) => ({
    filters: DEFAULT_FILTERS,
    pagination: DEFAULT_PAGINATION,
    modal: DEFAULT_MODAL,
    sortBy: 'recent',

    setCategoryFilter: (categoryId) => {
      set((state) => {
        state.filters.categoryId = categoryId
        state.pagination.page = 1
      })
    },

    setIngredientSearch: (text) => {
      set((state) => {
        state.filters.ingredientSearch = text
        state.pagination.page = 1
      })
    },

    setAllergenFilter: (text, mode) => {
      set((state) => {
        state.filters.allergenText = text
        state.filters.allergenMode = mode
        state.pagination.page = 1
      })
    },

    setPriceRange: (range) => {
      set((state) => {
        state.filters.priceRange = range
        state.pagination.page = 1
      })
    },

    setSoloDisponibles: (value) => {
      set((state) => {
        state.filters.soloDisponibles = value
        state.pagination.page = 1
      })
    },

    setSortBy: (sort) => {
      set((state) => {
        state.sortBy = sort
      })
    },

    resetFilters: () => {
      set((state) => {
        state.filters = DEFAULT_FILTERS
        state.pagination = DEFAULT_PAGINATION
        state.sortBy = 'recent'
      })
    },

    setPage: (page) => {
      set((state) => {
        state.pagination.page = page
      })
    },

    setPageSize: (size) => {
      set((state) => {
        state.pagination.size = size
        state.pagination.page = 1
      })
    },

    openModal: (product) => {
      set((state) => {
        state.modal.isOpen = true
        state.modal.selectedProduct = product
      })
    },

    closeModal: () => {
      set((state) => {
        state.modal.isOpen = false
        state.modal.selectedProduct = null
      })
    },
  })),
)
