/**
 * checkout.schema.ts — Esquemas Zod para el flujo de checkout.
 *
 *   - fiscalSchema: datos fiscales (DNI/RUC)
 *   - tarjetaSchema: simulación de pasarela de pago
 */

import { z } from 'zod'

// ── Luhn Algorithm ────────────────────────────────────────────────────────────

function luhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alternate = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  return sum % 10 === 0
}

// ── Fiscal ────────────────────────────────────────────────────────────────────

export type TipoDocumentoFiscal = 'DNI' | 'RUC'

export const fiscalSchema = z
  .object({
    tipo_documento: z.enum(['DNI', 'RUC'], { required_error: 'Selecciona un tipo de documento.' }),
    numero_documento: z
      .string()
      .min(8, 'Mínimo 8 dígitos.')
      .max(20, 'Máximo 20 dígitos.')
      .regex(/^\d+$/, 'Solo se permiten números.'),
    razon_social: z.string().optional(),
    direccion_fiscal: z.string().max(255).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_documento === 'DNI' && data.numero_documento.length !== 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numero_documento'],
        message: 'El DNI debe tener exactamente 8 dígitos.',
      })
    }
    if (data.tipo_documento === 'RUC' && data.numero_documento.length !== 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['numero_documento'],
        message: 'El RUC debe tener exactamente 11 dígitos.',
      })
    }
    if (data.tipo_documento === 'RUC' && (!data.razon_social || !data.razon_social.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['razon_social'],
        message: 'La razón social es obligatoria para RUC.',
      })
    }
    if (data.tipo_documento === 'RUC' && (!data.direccion_fiscal || data.direccion_fiscal.trim().length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['direccion_fiscal'],
        message: 'La dirección fiscal es obligatoria para RUC (mínimo 5 caracteres).',
      })
    }
  })

export type FiscalFormData = z.infer<typeof fiscalSchema>

// ── Tarjeta ───────────────────────────────────────────────────────────────────

export const tarjetaSchema = z.object({
  numero_tarjeta: z
    .string()
    .min(16, 'El número de tarjeta debe tener al menos 16 dígitos.')
    .refine((val) => luhnCheck((val ?? '').replace(/\s/g, '')), 'Número de tarjeta inválido (falló Luhn).'),
  expiracion: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/(\d{2})$/, 'Formato inválido. Usa MM/AA.')
    .refine((val) => {
      const [mm, aa] = val.split('/')
      const now = new Date()
      const currentMonth = now.getMonth() + 1
      const currentYear = now.getFullYear() % 100
      const expMonth = parseInt(mm!, 10)
      const expYear = parseInt(aa!, 10)
      return expYear > currentYear || (expYear === currentYear && expMonth >= currentMonth)
    }, 'La tarjeta está vencida.'),
  cvv: z
    .string()
    .length(3, 'El CVV debe tener 3 dígitos.')
    .regex(/^\d{3}$/, 'Solo números.'),
  titular: z
    .string()
    .min(3, 'Ingresa el nombre del titular.')
    .max(100)
    .regex(/^[A-Za-záéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo se permiten letras y espacios.'),
})

export type TarjetaFormData = z.infer<typeof tarjetaSchema>
