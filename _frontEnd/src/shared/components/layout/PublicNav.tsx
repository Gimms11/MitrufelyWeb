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
  const isHome = location.pathname === '/'
  const isCatalog = location.pathname === '/catalogo'
  const isNosotros = location.pathname === '/nosotros'
  const isPuntos = location.pathname === '/puntos'

  /** Clases de un ítem activo: permanente, línea completa abajo */
  const activeClass =
    "text-[#5c0f1b] font-black after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:bg-[#5c0f1b]"

  /** Clases de un ítem inactivo: línea empieza en 0 desde la izquierda y crece a la derecha al hacer hover */
  const inactiveClass =
    "text-[#2a1115]/70 font-bold hover:text-[#5c0f1b] after:content-[''] after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-0 hover:after:w-full after:bg-[#5c0f1b] after:transition-all after:duration-300"

  return (
    <nav className="relative hidden md:block">
      {/* Fondo glassy con degradado (mask para que el blur termine suavemente) */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent backdrop-blur-md pointer-events-none"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 md:px-12 flex items-center justify-start md:justify-center gap-6 md:gap-10 overflow-x-auto whitespace-nowrap scrollbar-none">
        {/* Inicio */}
        <Link
          to="/"
          className={`relative flex items-center gap-2 text-l py-3 transition-colors shrink-0 group ${
            isHome ? activeClass : inactiveClass
          }`}
        >
          <Home className="h-4 w-4 shrink-0" strokeWidth={isHome ? 2.5 : 2} />
          <span>Inicio</span>
        </Link>

        {/* Catálogo — ruta real */}
        <Link
          to="/catalogo"
          className={`relative flex items-center gap-2 text-l py-3 transition-colors shrink-0 group ${
            isCatalog ? activeClass : inactiveClass
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" strokeWidth={isCatalog ? 2.5 : 2} />
          <span>Catálogo</span>
        </Link>

        {/* Nosotros */}
        <Link
          to="/nosotros"
          className={`relative flex items-center gap-2 text-l py-3 transition-colors shrink-0 group ${
            isNosotros ? activeClass : inactiveClass
          }`}
        >
          <Users className="h-4 w-4 shrink-0" strokeWidth={isNosotros ? 2.5 : 2} />
          <span>Nosotros</span>
        </Link>

        {/* Criptotrufas */}
        <Link
          to="/puntos"
          className={`relative flex items-center gap-2 text-l py-3 transition-colors shrink-0 group ${
            isPuntos ? activeClass : inactiveClass
          }`}
        >
          <Award className="h-4 w-4 shrink-0" strokeWidth={isPuntos ? 2.5 : 2} />
          <span>Criptotrufas</span>
        </Link>
      </div>
    </nav>
  )
}
