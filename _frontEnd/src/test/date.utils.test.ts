import { describe, it, expect } from 'vitest'
import {
  parseDate,
  formatDate,
  formatDateShort,
  formatDateTime,
  daysUntil,
  isDateExpired,
  isDateExpiringSoon,
  toDateInputValue,
} from '@/shared/utils/date'

describe('Date Parsing & Formatting Layer', () => {
  describe('parseDate', () => {
    it('returns null for null, undefined or empty values', () => {
      expect(parseDate(null)).toBeNull()
      expect(parseDate(undefined)).toBeNull()
      expect(parseDate('')).toBeNull()
      expect(parseDate('   ')).toBeNull()
    })

    it('returns null for invalid date strings', () => {
      expect(parseDate('not-a-date')).toBeNull()
      expect(parseDate('2026-99-99')).toBeNull()
    })

    it('parses YYYY-MM-DD date-only strings without UTC timezone drift', () => {
      const parsed = parseDate('2026-08-20')
      expect(parsed).not.toBeNull()
      expect(parsed?.getFullYear()).toBe(2026)
      expect(parsed?.getMonth()).toBe(7) // August is 7 (0-indexed)
      expect(parsed?.getDate()).toBe(20)
      expect(parsed?.getHours()).toBe(0)
      expect(parsed?.getMinutes()).toBe(0)
    })

    it('parses ISO date-time strings properly', () => {
      const parsed = parseDate('2026-08-20T14:30:00Z')
      expect(parsed).not.toBeNull()
      expect(parsed instanceof Date).toBe(true)
      expect(isNaN(parsed!.getTime())).toBe(false)
    })

    it('handles Date instances directly', () => {
      const d = new Date(2026, 7, 20)
      expect(parseDate(d)).toBe(d)
    })
  })

  describe('formatDate & formatDateShort', () => {
    it('formats date-only strings consistently in DD/MM/YYYY', () => {
      expect(formatDateShort('2026-08-20')).toBe('20/08/2026')
    })

    it('formats date with custom options using formatDate', () => {
      const formatted = formatDate('2026-08-20', { month: 'long' })
      expect(formatted.toLowerCase()).toContain('agosto')
      expect(formatted).toContain('2026')
    })

    it('returns fallback string when date is null or invalid', () => {
      expect(formatDateShort(null)).toBe('—')
      expect(formatDateShort(undefined, 'N/A')).toBe('N/A')
      expect(formatDateShort('invalid', 'Sin fecha')).toBe('Sin fecha')
    })

    it('formatDateTime includes time', () => {
      const formatted = formatDateTime('2026-08-20T15:45:00')
      expect(formatted).toContain('20/08/2026')
      expect(formatted).toContain(':')
    })
  })

  describe('daysUntil, isDateExpired & isDateExpiringSoon', () => {
    it('calculates 0 days for today', () => {
      const todayStr = toDateInputValue(new Date())
      expect(daysUntil(todayStr)).toBe(0)
      expect(isDateExpired(todayStr)).toBe(true) // today is considered expired or at boundary
    })

    it('identifies future dates correctly', () => {
      const future = new Date()
      future.setDate(future.getDate() + 5)
      const futureStr = toDateInputValue(future)

      expect(daysUntil(futureStr)).toBe(5)
      expect(isDateExpired(futureStr)).toBe(false)
      expect(isDateExpiringSoon(futureStr, 7)).toBe(true)
      expect(isDateExpiringSoon(futureStr, 3)).toBe(false)
    })

    it('identifies past dates correctly', () => {
      const past = new Date()
      past.setDate(past.getDate() - 3)
      const pastStr = toDateInputValue(past)

      expect(daysUntil(pastStr)).toBe(-3)
      expect(isDateExpired(pastStr)).toBe(true)
      expect(isDateExpiringSoon(pastStr)).toBe(false)
    })
  })

  describe('toDateInputValue', () => {
    it('formats date cleanly for HTML date input YYYY-MM-DD', () => {
      const d = new Date(2026, 7, 5) // 5 August 2026
      expect(toDateInputValue(d)).toBe('2026-08-05')
      expect(toDateInputValue('2026-08-05')).toBe('2026-08-05')
      expect(toDateInputValue(null)).toBe('')
    })
  })
})
