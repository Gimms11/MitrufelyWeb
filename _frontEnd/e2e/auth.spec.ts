/**
 * Playwright E2E — Flujo de autenticación
 *
 * Estas pruebas verifican que los flujos de usuario del módulo de autenticación
 * funcionen correctamente en un navegador real Chromium, resolviendo RF-02.
 *
 * Requisito: el dev server debe estar corriendo en http://localhost:5173
 * Ejecutar con: npx playwright test
 */
import { test, expect } from '@playwright/test'

test.describe('Autenticación — Flujo de usuario E2E', () => {
  test('la página de login se renderiza correctamente', async ({ page }) => {
    await page.goto('/login')

    // Verificar que los campos del formulario existan
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()

    // Verificar que exista un botón de acción principal
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
  })

  test('login con credenciales inválidas muestra mensaje de error', async ({ page }) => {
    await page.goto('/login')

    // Llenar formulario con credenciales inválidas
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com')
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword')

    // Enviar formulario
    await page.click('button[type="submit"]')

    // Esperar a que aparezca un mensaje de error (toast o elemento de error)
    // Sonner usa [data-sonner-toast] y role="status"
    const errorIndicator = page.locator(
      '[data-sonner-toast], [role="alert"], .error, .toast-error, [class*="error"]',
    )
    await expect(errorIndicator.first()).toBeVisible({ timeout: 10_000 })
  })

  test('clic en enlace de registro navega a /register', async ({ page }) => {
    await page.goto('/login')

    // Buscar un enlace que lleve a registro
    const registerLink = page.locator('a[href="/register"], a[href*="register"]')
    await expect(registerLink.first()).toBeVisible()

    await registerLink.first().click()
    await expect(page).toHaveURL(/register/)
  })

  test('acceder a /dashboard sin sesión redirige a /login', async ({ page }) => {
    // Intentar acceder a una ruta protegida sin autenticación
    await page.goto('/dashboard')

    // Debería redirigir a /login
    await expect(page).toHaveURL(/login/)
  })
})
