/**
 * Tests de integración de red para cartApi usando MSW
 *
 * Estas pruebas validan que las funciones de cartApi funcionen correctamente
 * contra interceptaciones de red reales (no mocks de función), resolviendo RF-01.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { cartApi } from '../features/cart/api/cartApi'
import { setAccessToken } from '../lib/axios'

describe('cartApi (MSW — interceptación de red)', () => {
  beforeEach(() => {
    // Simular que el usuario está autenticado
    setAccessToken('fake_valid_token')
  })

  it('getCart devuelve el carrito con items mapeados', async () => {
    const cart = await cartApi.getCart()

    expect(cart.items).toHaveLength(2)
    expect(cart.total_items).toBe(3)
    expect(cart.subtotal).toBe(116.0)

    // Verificar que el mapeo numérico funciona
    expect(typeof cart.subtotal).toBe('number')
    expect(typeof cart.items[0]!.precio_unitario).toBe('number')
  })

  it('getCart devuelve los datos correctos del primer item', async () => {
    const cart = await cartApi.getCart()
    const firstItem = cart.items[0]!

    expect(firstItem.id_producto).toBe(10)
    expect(firstItem.nombre).toBe('Trufa de Chocolate')
    expect(firstItem.cantidad).toBe(2)
    expect(firstItem.precio_unitario).toBe(15.5)
    expect(firstItem.es_paquete).toBe(false)
  })

  it('addItem agrega un producto y devuelve carrito actualizado', async () => {
    const cart = await cartApi.addItem({
      id_producto: 30,
      cantidad: 3,
    })

    // Debería tener los 2 items originales + el nuevo
    expect(cart.items).toHaveLength(3)
    expect(cart.total_items).toBe(6) // 3 original + 3 new

    const newItem = cart.items.find((i) => i.id_producto === 30)
    expect(newItem).toBeDefined()
    expect(newItem!.cantidad).toBe(3)
    expect(newItem!.nombre).toBe('Nuevo Producto')
  })

  it('removeItem elimina un producto del carrito', async () => {
    const cart = await cartApi.removeItem(10)

    // Debería tener solo 1 item (se eliminó el id_producto=10)
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0]!.id_producto).toBe(20)
    expect(cart.items.find((i) => i.id_producto === 10)).toBeUndefined()
  })
})
