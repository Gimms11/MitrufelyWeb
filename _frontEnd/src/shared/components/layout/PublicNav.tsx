/**
 * PublicNav.tsx — Menú de navegación secundario (subheader)
 *
 * Barra de links bajo el header principal. Puramente presentacional.
 *
 * UI REFACTOR:
 *  - Item activo: texto en negrita (font-bold) + underline grueso borgoña
 *  - Items inactivos: peso normal (font-normal), sin subrayado
 *  - Separador inferior sutil usando border-b
 */
import { Users, BookOpen, Home, Award } from 'lucide-react'
import { Link, useLocation } from 'react-router'

// ─── Componente ───────────────────────────────────────────────────────────

export function PublicNav() {
  const location = useLocation()
  const isHome     = location.pathname === '/'
  const isCatalog  = location.pathname === '/catalogo'
  const isNosotros = location.pathname === '/nosotros'
  const isPuntos   = location.pathname === '/puntos'

  /** Clases de un ítem activo: bold + underline blanco grueso */
  const activeClass =
    'text-white font-bold border-b-[3px] border-white'

  /** Clases de un ítem inactivo: peso normal, sin underline */
  const inactiveClass =
    'text-white/65 font-normal border-b-[3px] border-transparent hover:text-white hover:border-white/40 transition-colors'

  return (
    <nav className="bg-[#5c0f1b] border-b border-[#4a0a14] hidden md:block">
      <div className="max-w-7xl mx-auto px-4 md:px-12 flex items-center justify-start md:justify-center gap-6 md:gap-10 overflow-x-auto whitespace-nowrap scrollbar-none">

        {/* Inicio */}
        <Link
          to="/"
          className={`flex items-center gap-2 text-sm py-3 transition-all shrink-0 ${
            isHome ? activeClass : inactiveClass
          }`}
        >
          <Home className="h-4 w-4 shrink-0" strokeWidth={isHome ? 2.5 : 2} />
          <span>Inicio</span>
        </Link>

        {/* Catálogo — ruta real */}
        <Link
          to="/catalogo"
          className={`flex items-center gap-2 text-sm py-3 transition-all shrink-0 ${
            isCatalog ? activeClass : inactiveClass
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" strokeWidth={isCatalog ? 2.5 : 2} />
          <span>Catálogo</span>
        </Link>

        {/* Nosotros */}
        <Link
          to="/nosotros"
          className={`flex items-center gap-2 text-sm py-3 transition-all shrink-0 ${
            isNosotros ? activeClass : inactiveClass
          }`}
        >
          <Users className="h-4 w-4 shrink-0" strokeWidth={isNosotros ? 2.5 : 2} />
          <span>Nosotros</span>
        </Link>

        {/* Tus puntos */}
        <Link
          to="/puntos"
          className={`flex items-center gap-2 text-sm py-3 transition-all shrink-0 ${
            isPuntos ? activeClass : inactiveClass
          }`}
        >
          <Award className="h-4 w-4 shrink-0" strokeWidth={isPuntos ? 2.5 : 2} />
          <span>Tus puntos</span>
        </Link>
      </div>
    </nav>
  )
}
