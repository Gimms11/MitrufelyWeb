/**
 * MSW Server — Servidor de interceptación de red para Vitest (Node.js)
 */
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
