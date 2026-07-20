/**
 * MSW Handlers — Simuladores de endpoints del backend MitrufelyWeb
 *
 * Estos handlers interceptan las llamadas HTTP a nivel de red (no a nivel de función)
 * para probar que los módulos authApi y cartApi funcionen con respuestas reales.
 */
import { http, HttpResponse } from 'msw'

const BASE_URL = 'http://localhost:8000/api/v1'

// ─── Datos de prueba ──────────────────────────────────────────────────────────

const VALID_EMAIL = 'test@mitrufely.com'
const VALID_PASSWORD = 'password123'

const FAKE_ACCESS_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6IkNMSUVOVEUiLCJlbWFpbCI6InRlc3RAbWl0cnVmZWx5LmNvbSIsIm5vbWJyZXMiOiJKdWFuIiwiYXBlbGxpZG9zIjoiUGVyZXoifQ.fake_signature'

const FAKE_USER_ME = {
  id_usuario: 1,
  nombres: 'Juan',
  apellidos: 'Perez',
  email: VALID_EMAIL,
  telefono: '999888777',
  estado: true,
  auth_provider: 'local',
  rol: { id_rol: 4, nombre: 'CLIENTE' },
  cliente: {
    id_cliente: 1,
    direccion: 'Av. Test 123',
    referencia: 'Cerca al parque',
    telefono: '999888777',
  },
  avatar_url: null,
}

const FAKE_CART = {
  items: [
    {
      id_producto: 10,
      nombre: 'Trufa de Chocolate',
      cantidad: 2,
      precio_unitario: 15.5,
      imagen_url: null,
      es_paquete: false,
      id_paquete: null,
      stock_actual: 50,
    },
    {
      id_producto: 20,
      nombre: 'Caja Premium x6',
      cantidad: 1,
      precio_unitario: 85.0,
      imagen_url: null,
      es_paquete: true,
      id_paquete: 5,
      stock_actual: 10,
    },
  ],
  total_items: 3,
  subtotal: 116.0,
  updated_at: '2026-07-20T12:00:00Z',
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────────────

  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    if (body.email === VALID_EMAIL && body.password === VALID_PASSWORD) {
      return HttpResponse.json({
        access_token: FAKE_ACCESS_TOKEN,
        refresh_token: 'refresh_token_msw_test',
        token_type: 'bearer',
        expires_in: 3600,
      })
    }

    return HttpResponse.json(
      { error: { message: 'Credenciales incorrectas' } },
      { status: 401 },
    )
  }),

  http.get(`${BASE_URL}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { detail: 'Not authenticated' },
        { status: 401 },
      )
    }
    return HttpResponse.json(FAKE_USER_ME)
  }),

  http.post(`${BASE_URL}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // ── Cart ──────────────────────────────────────────────────────────────────

  http.get(`${BASE_URL}/cart`, () => {
    return HttpResponse.json(FAKE_CART)
  }),

  http.post(`${BASE_URL}/cart/items`, async ({ request }) => {
    const body = (await request.json()) as { id_producto: number; cantidad: number }
    const newItem = {
      id_producto: body.id_producto,
      nombre: 'Nuevo Producto',
      cantidad: body.cantidad,
      precio_unitario: 25.0,
      imagen_url: null,
      es_paquete: false,
      id_paquete: null,
      stock_actual: 30,
    }
    return HttpResponse.json({
      ...FAKE_CART,
      items: [...FAKE_CART.items, newItem],
      total_items: FAKE_CART.total_items + body.cantidad,
      subtotal: FAKE_CART.subtotal + newItem.precio_unitario * body.cantidad,
    })
  }),

  http.delete(`${BASE_URL}/cart/items/:id`, ({ params }) => {
    const idProducto = Number(params['id'])
    const filteredItems = FAKE_CART.items.filter((i) => i.id_producto !== idProducto)
    const removedItem = FAKE_CART.items.find((i) => i.id_producto === idProducto)
    return HttpResponse.json({
      ...FAKE_CART,
      items: filteredItems,
      total_items: FAKE_CART.total_items - (removedItem?.cantidad ?? 0),
      subtotal: FAKE_CART.subtotal - (removedItem ? removedItem.precio_unitario * removedItem.cantidad : 0),
    })
  }),
]
