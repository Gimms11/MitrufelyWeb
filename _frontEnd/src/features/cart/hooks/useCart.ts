import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cartApi } from '../api/cartApi'
import type { AddCartItemRequest, CartCheckoutResponse, CartResponse } from '../api/cartApi'
import { useAuthStore } from '@/app/store'
import { catalogAdminApi } from '@/features/products/api/catalogAdminApi'
import { packagesApi } from '@/features/products/api/packagesApi'

export const CART_QUERY_KEY = ['cart'] as const

// ─── Guest Cart Helpers ───────────────────────────────────────────────────────

function getLocalCart(): CartResponse {
  const raw = sessionStorage.getItem('mitrufely-guest-cart')
  if (!raw) {
    return { items: [], total_items: 0, subtotal: 0 }
  }
  try {
    const parsed = JSON.parse(raw)
    return {
      items: parsed.items || [],
      total_items: Number(parsed.total_items || 0),
      subtotal: Number(parsed.subtotal || 0),
    }
  } catch {
    return { items: [], total_items: 0, subtotal: 0 }
  }
}

function saveLocalCart(cart: CartResponse) {
  sessionStorage.setItem('mitrufely-guest-cart', JSON.stringify(cart))
}

async function fetchItemDetails(item: AddCartItemRequest) {
  if (item.es_paquete && item.id_paquete) {
    const pkg = await packagesApi.getById(item.id_paquete)
    return {
      id_producto: item.id_producto,
      nombre: pkg.nombre,
      precio_unitario: Number(pkg.precio || 0),
      imagen_url: pkg.imagen_url,
      es_paquete: true,
      id_paquete: item.id_paquete,
    }
  } else {
    const prod = await catalogAdminApi.getProduct(item.id_producto)
    return {
      id_producto: item.id_producto,
      nombre: prod.nombre,
      precio_unitario: Number(prod.precio),
      imagen_url: prod.imagen_url,
      es_paquete: false,
      id_paquete: null,
    }
  }
}

// ─── Query ───────────────────────────────────────────────────────────────────

export function useCartQuery(options?: { enabled?: boolean }) {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: [...CART_QUERY_KEY, isAuthenticated],
    queryFn: async () => {
      if (isAuthenticated) {
        return cartApi.getCart()
      } else {
        return getLocalCart()
      }
    },
    staleTime: 30_000,
    ...options,
  })
}

// ─── Selector helpers ────────────────────────────────────────────────────────

export function useCartItemCount(): number {
  const { data } = useCartQuery()
  return data?.total_items ?? 0
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useAddCartItem() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  return useMutation({
    mutationFn: async (item: AddCartItemRequest) => {
      if (isAuthenticated) {
        return cartApi.addItem(item)
      } else {
        const details = await fetchItemDetails(item)
        const cart = getLocalCart()
        const existing = cart.items.find((i) => i.id_producto === details.id_producto)
        if (existing) {
          existing.cantidad += item.cantidad
        } else {
          cart.items.push({
            id_producto: details.id_producto,
            nombre: details.nombre,
            cantidad: item.cantidad,
            precio_unitario: details.precio_unitario,
            imagen_url: details.imagen_url,
            es_paquete: details.es_paquete,
            id_paquete: details.id_paquete,
          })
        }
        cart.total_items = cart.items.reduce((acc, i) => acc + i.cantidad, 0)
        cart.subtotal = cart.items.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0)
        saveLocalCart(cart)
        return cart
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...CART_QUERY_KEY, isAuthenticated], data)
      toast.success('Producto agregado al carrito 🛍️', { duration: 2000 })
    },
    onError: () => {
      toast.error('No se pudo agregar al carrito.')
    },
  })
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  return useMutation({
    mutationFn: async ({ id_producto, cantidad }: { id_producto: number; cantidad: number }) => {
      if (isAuthenticated) {
        return cartApi.updateItem(id_producto, { cantidad })
      } else {
        const cart = getLocalCart()
        const item = cart.items.find((i) => i.id_producto === id_producto)
        if (item) {
          item.cantidad = cantidad
        }
        cart.total_items = cart.items.reduce((acc, i) => acc + i.cantidad, 0)
        cart.subtotal = cart.items.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0)
        saveLocalCart(cart)
        return cart
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...CART_QUERY_KEY, isAuthenticated], data)
    },
    onError: () => {
      toast.error('No se pudo actualizar la cantidad.')
    },
  })
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  return useMutation({
    mutationFn: async (id_producto: number) => {
      if (isAuthenticated) {
        return cartApi.removeItem(id_producto)
      } else {
        const cart = getLocalCart()
        cart.items = cart.items.filter((i) => i.id_producto !== id_producto)
        cart.total_items = cart.items.reduce((acc, i) => acc + i.cantidad, 0)
        cart.subtotal = cart.items.reduce((acc, i) => acc + i.precio_unitario * i.cantidad, 0)
        saveLocalCart(cart)
        return cart
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData([...CART_QUERY_KEY, isAuthenticated], data)
      toast.info('Producto eliminado del carrito.')
    },
    onError: () => {
      toast.error('No se pudo eliminar del carrito.')
    },
  })
}

export function useClearCart() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()

  return useMutation({
    mutationFn: async () => {
      if (isAuthenticated) {
        return cartApi.clearCart()
      } else {
        sessionStorage.removeItem('mitrufely-guest-cart')
      }
    },
    onSuccess: () => {
      queryClient.setQueryData([...CART_QUERY_KEY, isAuthenticated], { items: [], total_items: 0, subtotal: 0 })
      toast.info('Carrito vaciado.')
    },
    onError: () => {
      toast.error('No se pudo vaciar el carrito.')
    },
  })
}

export function useCheckoutCart() {
  const queryClient = useQueryClient()

  return useMutation<CartCheckoutResponse, Error, number | undefined>({
    mutationFn: (id_cupon_cliente?: number) => cartApi.checkoutCart(id_cupon_cliente),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
