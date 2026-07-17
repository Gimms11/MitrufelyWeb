/**
 * ScrollToTop.tsx
 *
 * Hace scroll al inicio de la página en cada cambio de ruta.
 * Se coloca dentro de <BrowserRouter> para tener acceso al hook useLocation.
 * No renderiza nada visible — es puramente un efecto de comportamiento.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll instantáneo al top en cada cambio de ruta
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
