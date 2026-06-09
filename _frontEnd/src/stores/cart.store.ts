/**
 * cart.store.ts — Estado global del Carrito de Compras (SIAM / Mitrufely)
 *
 * Gestiona:
 *   - items: lista de productos + cantidad
 *   - coupon: código aplicado
 *   - discount: monto restado (S/ 5.00 para "TRUFA20")
 *
 * Computed (selectors puros):
 *   - subtotal, total
 *
 * Patrones: Zustand + immer (consistente con catalog.store.ts y auth.store.ts)
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Producto } from '@/features/products/types'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface CartItem {
  product: Producto
  quantity: number
}

export type CouponCode = 'TRUFA20'

const VALID_COUPONS: Record<CouponCode, number> = {
  TRUFA20: 5.0,
}

// ─── State / Actions ─────────────────────────────────────────────────────────

interface CartState {
  items: CartItem[]
  coupon: string | null
  discount: number
}

interface CartActions {
  addToCart: (product: Producto, quantity?: number) => void
  removeFromCart: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  applyCoupon: (code: string) => { success: boolean; message: string }
  removeCoupon: () => void
  clearCart: () => void
}

export type CartStore = CartState & CartActions

// ─── Selectores (computed) ───────────────────────────────────────────────────

export const selectSubtotal = (state: CartState): number =>
  state.items.reduce(
    (acc, item) => acc + Number(item.product.precio) * item.quantity,
    0,
  )

export const selectTotal = (state: CartState): number =>
  Math.max(0, selectSubtotal(state) - state.discount)

export const selectItemCount = (state: CartState): number =>
  state.items.reduce((acc, item) => acc + item.quantity, 0)

// ─── Store ──────────────────────────────────────────────────────────────────

export const useCartStore = create<CartStore>()(
  immer((set, get) => ({
    // ─── Estado inicial ─────────────────────────────────────────────────────
    items: [],
    coupon: null,
    discount: 0,

    // ─── Acciones ───────────────────────────────────────────────────────────

    addToCart: (product, quantity = 1) => {
      set((state) => {
        const existing = state.items.find(
          (i) => i.product.id_producto === product.id_producto,
        )
        if (existing) {
          existing.quantity += quantity
        } else {
          state.items.push({ product, quantity })
        }
      })
    },

    removeFromCart: (productId) => {
      set((state) => {
        state.items = state.items.filter(
          (i) => i.product.id_producto !== productId,
        )
      })
    },

    updateQuantity: (productId, quantity) => {
      set((state) => {
        if (quantity <= 0) {
          state.items = state.items.filter(
            (i) => i.product.id_producto !== productId,
          )
          return
        }
        const item = state.items.find(
          (i) => i.product.id_producto === productId,
        )
        if (item) item.quantity = quantity
      })
    },

    applyCoupon: (code) => {
      const normalized = code.trim().toUpperCase() as CouponCode
      const discountAmount = VALID_COUPONS[normalized]

      if (!discountAmount) {
        return { success: false, message: 'Cupón inválido o no existe.' }
      }

      const subtotal = selectSubtotal(get())
      if (discountAmount > subtotal) {
        return {
          success: false,
          message: 'El cupón supera el monto de la compra.',
        }
      }

      set((state) => {
        state.coupon = normalized
        state.discount = discountAmount
      })

      return {
        success: true,
        message: `Cupón "${normalized}" aplicado. Descuento: S/ ${discountAmount.toFixed(2)}`,
      }
    },

    removeCoupon: () => {
      set((state) => {
        state.coupon = null
        state.discount = 0
      })
    },

    clearCart: () => {
      set((state) => {
        state.items = []
        state.coupon = null
        state.discount = 0
      })
    },
  })),
)
