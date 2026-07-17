/**
 * HomePage.tsx — Página pública principal de Mitrufely
 *
 * Única responsabilidad: orquestar estado de UI y componer las secciones.
 *
 * Este archivo NO contiene:
 *   - JSX de layout detallado  → shared/components/layout/
 *   - Secciones de dominio     → features/products/components/
 *   - Tipos / datos            → features/products/types.ts + api/mockData.ts
 *   - CSS custom               → eliminado; todo es Tailwind utility
 */
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/app/store'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { useCartItemCount } from '@/features/cart/hooks/useCart'

// Layout compartido
import { PublicHeader }  from '@/shared/components/layout/PublicHeader'

import { PublicFooter }  from '@/shared/components/layout/PublicFooter'

// Secciones de dominio
import { HeroSection }    from '@/features/products/components/HeroSection'
import { CatalogSection } from '@/features/products/components/CatalogSection'
import { PacksSection }   from '@/features/products/components/PacksSection'
import { BenefitsSection } from '@/features/products/components/BenefitsSection'
import { AuthRequireModal } from '@/features/auth/components/AuthRequireModal'

// ─── Página ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const { user, isAuthenticated } = useAuthStore()
  const logout = useLogout()
  const navigate = useNavigate()

  // ── Estado de UI ──────────────────────────────────────────────────────
  const [searchQuery,   setSearchQuery]   = useState('')
  const [activeTab,     setActiveTab]     = useState<string>('')
  const [favorites]                       = useState<number[]>([])
  const [userMenuOpen,  setUserMenuOpen]  = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const cartCount = useCartItemCount()

  const catalogRef = useRef<HTMLElement>(null)

  // Forzar fondo claro ignorando el dark mode del sistema operativo
  useEffect(() => {
    const prevBg    = document.body.style.backgroundColor
    const prevColor = document.body.style.color
    document.body.style.backgroundColor = '#faf8f5'
    document.body.style.color           = '#2a1115'
    return () => {
      document.body.style.backgroundColor = prevBg
      document.body.style.color           = prevColor
    }
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`)
  }

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
    toast.success('Sesión cerrada correctamente.')
  }

  const scrollToCatalog = () =>
    catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const handleCriptotrufasClick = () => {
    if (isAuthenticated) {
      navigate('/puntos')
    } else {
      setAuthModalOpen(true)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased">

      {/* ── Bloque de navegación fijo ── */}
      <PublicHeader
        cartCount={cartCount}
        favoriteCount={favorites.length}
        coinsBalance={isAuthenticated && user ? user.sweetCoinsBalance : null}
        userName={isAuthenticated && user ? user.name : null}
        userMenuOpen={userMenuOpen}
        onUserMenuToggle={() => setUserMenuOpen((o) => !o)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        onLogout={handleLogout}
      />
      <HeroSection
        onCatalogClick={scrollToCatalog}
        onCriptotrufasClick={handleCriptotrufasClick}
      />

      <CatalogSection
        ref={catalogRef}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
      />

      <PacksSection />

      <BenefitsSection onCriptotrufasClick={handleCriptotrufasClick} />

      <PublicFooter />

      <AuthRequireModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}
