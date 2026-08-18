/**
 * Mitrufely Web — Capa Robusta de Parseo y Formateo de Fechas
 *
 * Resuelve:
 * 1. Desfase de 1 día en strings de fecha pura ('YYYY-MM-DD') debido a timezone UTC vs Local.
 * 2. Formateo resiliente ante valores null, undefined, cadenas vacías o fechas inválidas.
 * 3. Cálculos de diferencia de días para control FEFO/expiración (comparando inicio de día).
 */

/**
 * Parsea cualquier entrada de fecha (ISO con hora, 'YYYY-MM-DD', timestamp o Date)
 * de forma segura y devuelve un objeto Date en la zona horaria local, o null si es inválida.
 */
export function parseDate(input: string | Date | number | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') {
    return null
  }

  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input
  }

  if (typeof input === 'number') {
    const d = new Date(input)
    return isNaN(d.getTime()) ? null : d
  }

  const str = String(input).trim()
  if (!str) return null

  // Caso 1: Formato 'YYYY-MM-DD' puro (ej. devuelto por Postgres type DATE)
  // Se interpreta como fecha local (año, mes - 1, día) para evitar que JS lo trate como UTC 00:00:00
  const dateOnlyRegex = /^(\d{4})-(\d{2})-(\d{2})$/
  const match = str.match(dateOnlyRegex)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return null
    }

    const parsed = new Date(year, month - 1, day, 0, 0, 0, 0)
    // Verificar que no hubo rollover (ej. 31 de febrero -> 3 de marzo)
    if (
      isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null
    }

    return parsed
  }

  // Caso 2: Formato ISO con hora o fecha estándar
  const parsed = new Date(str)
  return isNaN(parsed.getTime()) ? null : parsed
}

/**
 * Formatea una fecha a string legible en español (ej. '20 ago. 2026' o '20/08/2026').
 */
export function formatDate(
  input: string | Date | number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  fallback = '—'
): string {
  const date = parseDate(input)
  if (!date) return fallback

  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }

  try {
    return new Intl.DateTimeFormat('es-PE', defaultOptions).format(date)
  } catch {
    return fallback
  }
}

/**
 * Formateo numérico simple DD/MM/YYYY (ej. '20/08/2026').
 */
export function formatDateShort(
  input: string | Date | number | null | undefined,
  fallback = '—'
): string {
  return formatDate(
    input,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    },
    fallback
  )
}

/**
 * Formateo completo con fecha y hora (ej. '20 ago. 2026, 14:30' o '20/08/2026 14:30').
 */
export function formatDateTime(
  input: string | Date | number | null | undefined,
  fallback = '—'
): string {
  return formatDate(
    input,
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
    fallback
  )
}

/**
 * Calcula los días enteros restantes hasta una fecha objetivo comparando el inicio del día.
 * - Retorna > 0 si la fecha es futura (ej. 1 = mañana).
 * - Retorna 0 si la fecha es hoy.
 * - Retorna < 0 si la fecha ya pasó (ej. -1 = ayer).
 * - Retorna null si la entrada es inválida/null.
 */
export function daysUntil(input: string | Date | number | null | undefined): number | null {
  const targetDate = parseDate(input)
  if (!targetDate) return null

  // Normalizar ambas fechas a medianoche local (00:00:00) para contar días enteros de calendario
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(targetDate.getTime())
  target.setHours(0, 0, 0, 0)

  const diffMs = target.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Determina si una fecha ya expiró (es anterior al día de hoy).
 */
export function isDateExpired(input: string | Date | number | null | undefined): boolean {
  const diff = daysUntil(input)
  if (diff === null) return false
  return diff <= 0
}

/**
 * Determina si una fecha está próxima a expirar (dentro de los próximos N días).
 */
export function isDateExpiringSoon(
  input: string | Date | number | null | undefined,
  thresholdDays = 7
): boolean {
  const diff = daysUntil(input)
  if (diff === null) return false
  return diff > 0 && diff <= thresholdDays
}

/**
 * Convierte cualquier fecha al formato 'YYYY-MM-DD' requerido por inputs HTML <input type="date">.
 */
export function toDateInputValue(input: string | Date | number | null | undefined): string {
  const date = parseDate(input)
  if (!date) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
