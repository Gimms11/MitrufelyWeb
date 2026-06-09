/**
 * checkout.schema.ts — Esquema Zod para el formulario de pago.
 *
 * Validaciones:
 *   - Datos personales: nombre, apellidos, teléfono, correo
 *   - Documento: DNI (8 dígitos) o RUC (11 dígitos)
 *   - Envío: dirección, referencia
 *   - Pago: método seleccionado
 *   - RazónSocial: requerida solo si el tipo de documento es RUC
 */

import { z } from 'zod'

export type TipoDocumento = 'DNI' | 'RUC'
export type MetodoPago   = 'tarjeta' | 'billetera' | 'efectivo'

export const checkoutSchema = z
  .object({
    // ── Datos personales ─────────────────────────────────────────────────
    nombres: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres.')
      .max(80, 'El nombre es demasiado largo.')
      .regex(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo se permiten letras y espacios.'),

    apellidos: z
      .string()
      .min(2, 'Los apellidos deben tener al menos 2 caracteres.')
      .max(100, 'Los apellidos son demasiado largos.')
      .regex(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo se permiten letras y espacios.'),

    telefono: z
      .string()
      .regex(/^\+?[\d\s\-()]{7,15}$/, 'Ingresa un teléfono válido (7–15 dígitos).'),

    correo: z
      .string()
      .email('Ingresa un correo electrónico válido.'),

    // ── Documento ────────────────────────────────────────────────────────
    tipoDocumento: z.enum(['DNI', 'RUC'], {
      required_error: 'Selecciona un tipo de documento.',
    }),

    numeroDocumento: z
      .string()
      .min(8, 'El número de documento debe tener al menos 8 dígitos.')
      .max(11, 'El número de documento no puede superar los 11 dígitos.')
      .regex(/^\d+$/, 'Solo se permiten números.'),

    razonSocial: z.string().optional(),

    // ── Envío ────────────────────────────────────────────────────────────
    direccion: z
      .string()
      .min(5, 'La dirección debe tener al menos 5 caracteres.')
      .max(200, 'La dirección es demasiado larga.'),

    referencia: z
      .string()
      .min(3, 'La referencia debe tener al menos 3 caracteres.')
      .max(150, 'La referencia es demasiado larga.'),

    // ── Método de pago ───────────────────────────────────────────────────
    metodoPago: z.enum(['tarjeta', 'billetera', 'efectivo'], {
      required_error: 'Selecciona un método de pago.',
    }),
  })
  // Validación cruzada: RUC requiere Razón Social
  .superRefine((data, ctx) => {
    if (data.tipoDocumento === 'DNI' && data.numeroDocumento.length !== 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numeroDocumento'],
        message: 'El DNI debe tener exactamente 8 dígitos.',
      })
    }
    if (data.tipoDocumento === 'RUC' && data.numeroDocumento.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numeroDocumento'],
        message: 'El RUC debe tener exactamente 11 dígitos.',
      })
    }
    if (data.tipoDocumento === 'RUC' && !data.razonSocial?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['razonSocial'],
        message: 'La razón social es requerida para RUC.',
      })
    }
  })

export type CheckoutFormData = z.infer<typeof checkoutSchema>
