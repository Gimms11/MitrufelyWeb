/**
 * PublicHeader.tsx — Header principal de la página pública
 *
 * Contiene: logo, buscador, balance CriptoTrufas, favoritos, carrito, menú usuario.
 * Recibe todo el estado necesario via props — no se conecta directamente al store
 * para mantenerse testeable y desacoplado.
 *
 * UI REFACTOR: Fondo claro crema, sin borde superior, parte del bloque sticky.
 */
import {
  Search,
  Star,
  User,
  ShoppingCart,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  BookOpen,
  Users,
  Award,
  Home,
  ArrowRight,
  PackageX,
} from 'lucide-react'
import { Link, useNavigate, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useAuthStore } from '@/app/store'
import { useCriptoTrufaStore } from '@/stores/criptotrufa.store'
import { useState, useEffect, useRef } from 'react'
import { PublicNav } from './PublicNav'
import { NotificationBell } from '@/features/notifications/components/NotificationBell'
import { useOrdersQuery } from '@/features/orders/hooks/useOrders'
import { useActiveProducts } from '@/features/products/hooks/useCatalogAdmin'
import type { Producto } from '@/features/products/types'

// ─── Props ────────────────────────────────────────────────────────────────

interface PublicHeaderProps {
  /** Número de ítems en el carrito */
  cartCount: number
  /** IDs de trufas marcadas como favorito */
  favoriteCount: number
  /** Balance de CriptoTrufas del usuario */
  coinsBalance: number | null
  /** Nombre del usuario autenticado (null si no hay sesión) */
  userName: string | null
  /** Estado de menú de usuario */
  userMenuOpen: boolean
  onUserMenuToggle: () => void
  /** Valor actual del campo de búsqueda */
  searchQuery: string
  onSearchChange: (q: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  onLogout: () => void
}

// ─── Componente ───────────────────────────────────────────────────────────

export function PublicHeader({
  cartCount,
  coinsBalance,
  userName,
  userMenuOpen,
  onUserMenuToggle,
  searchQuery,
  onSearchChange,
  onSearchSubmit: _onSearchSubmit,
  onLogout,
}: PublicHeaderProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const isAuthenticated = userName !== null
  const { user } = useAuthStore()
  const isCartPage = pathname === '/carrito'
  const isPuntosPage = pathname === '/puntos'
  const isAccountPage = pathname.startsWith('/mi-cuenta')

  const saldoActual = useCriptoTrufaStore((s) => s.saldoActual)
  const hydrateSweetCoins = useCriptoTrufaStore((s) => s.hydrateSweetCoins)

  useEffect(() => {
    if (isAuthenticated) {
      hydrateSweetCoins()
    }
    // Access unused props for satisfies TS compiler
    void coinsBalance
    void _onSearchSubmit
  }, [isAuthenticated, hydrateSweetCoins, coinsBalance, _onSearchSubmit])

  // ── Auto-hide al scroll ───────────────────────────────────────────────
  const [visible, setVisible] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const lastY = useRef(0)

  // ── Live search state ───────────────────────────────────────────────
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce de 300ms sobre searchQuery
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const { data: searchData } = useActiveProducts(
    { search: debouncedQuery, size: 50 },
    { enabled: debouncedQuery.trim().length >= 2 },
  )

  const allMatches: Producto[] =
    debouncedQuery.trim().length >= 2
      ? (searchData?.items ?? []).filter((p) => {
          const q = debouncedQuery.toLowerCase()
          return (
            p.nombre.toLowerCase().includes(q) ||
            (p.ingredientes ?? '').toLowerCase().includes(q) ||
            (p.descripcion ?? '').toLowerCase().includes(q)
          )
        })
      : []

  const searchPreview = allMatches.slice(0, 3)
  const hasMoreResults = allMatches.length > 3
  const isSearched = debouncedQuery.trim().length >= 2

  // Cerrar dropdown al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY
      if (currentY < 60) {
        // Siempre visible cerca del top
        setVisible(true)
      } else if (currentY > lastY.current + 4) {
        // Bajando: ocultar
        setVisible(false)
      } else if (currentY < lastY.current - 4) {
        // Subiendo: mostrar
        setVisible(true)
      }
      lastY.current = currentY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Notificaciones de Calificación Pendiente ──────────────────────────────
  const { data: orders = [] } = useOrdersQuery()
  const pendingReviews = orders.filter((o) => o.estado === 'ENTREGADO' && !o.has_review)
  useEffect(() => {
    const alreadyNotified = sessionStorage.getItem('pendingReviewsNotified')
    if (isAuthenticated && pendingReviews.length > 0 && !alreadyNotified) {
      toast.custom(
        (t) => (
          <div className="bg-white border-2 border-yellow-400 rounded-2xl p-4 shadow-xl flex gap-4 items-start w-full sm:w-[350px]">
            <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-yellow-600 fill-yellow-600" />
            </div>
            <div className="flex-1">
              <h3
                className="font-black text-[#5c0f1b] text-base"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                ¡Hola{userName ? `, ${userName.split(' ')[0]}` : ''}!
              </h3>
              <p className="text-xs text-[#2a1115]/70 font-medium mt-0.5">
                Tienes {pendingReviews.length} pedido(s) entregado(s) esperando tu calificación.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    toast.dismiss(t)
                    navigate('/mi-cuenta/pedidos')
                  }}
                  className="px-4 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold text-xs rounded-xl transition-colors"
                >
                  Calificar ahora
                </button>
                <button
                  onClick={() => toast.dismiss(t)}
                  className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs rounded-xl transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        ),
        { id: 'pending-reviews', duration: 10000 },
      )
      sessionStorage.setItem('pendingReviewsNotified', 'true')
    }
  }, [isAuthenticated, pendingReviews.length, navigate, userName])

  return (
    <motion.div
      animate={{ y: visible ? 0 : '-100%' }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="sticky top-0 z-50 shadow-sm"
    >
      <header className="bg-[#5c0f1b]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4">
          {/* Hamburger Menu Toggle (mobile only) */}
          <button
            id="hp-hamburger-btn"
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-2 text-white/80 hover:text-white transition-colors cursor-pointer mr-1 -ml-2 border-none bg-[#5c0f1b] outline-none"
            aria-label="Menú de navegación"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Logo */}
          <Link to="/" className="shrink-0 select-none group">
            <span
              className="text-white font-black text-2xl md:text-3xl tracking-tight group-hover:text-[#ff7a45] transition-colors"
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em' }}
            >
              Mitrufely
            </span>
          </Link>

          {/* Buscador con Live Search */}
          <div ref={searchBoxRef} className="hidden md:flex flex-1 max-w-sm relative">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!searchQuery.trim()) return
                navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`)
                setSearchOpen(false)
              }}
              className="relative w-full"
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
              <input
                id="hp-search"
                type="text"
                className="bg-white/15 border border-white/20 rounded-full px-5 pl-10 py-2.5 text-white text-sm font-medium placeholder:text-white/50 focus:outline-none focus:bg-white/22 focus:border-white/35 transition-all w-full"
                placeholder="Buscar trufas, sabores..."
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                autoComplete="off"
              />
            </form>

            {/* Dropdown de resultados */}
            <AnimatePresence>
              {searchOpen && isSearched && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ duration: 0.16 }}
                  className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl  overflow-hidden z-50"
                >
                  {searchPreview.length > 0 ? (
                    <>
                      <ul className="divide-y ">
                        {searchPreview.map((p) => (
                          <li
                            key={p.id_producto}
                            onClick={() => {
                              navigate(`/producto/${p.slug}`)
                              setSearchOpen(false)
                            }}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-[#5c0f1b]/5 cursor-pointer transition-colors"
                          >
                            {p.imagen_url && (
                              <img
                                src={p.imagen_url}
                                alt={p.nombre}
                                className="h-10 w-10 rounded-xl object-cover shrink-0 "
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-black text-[#2a1115] truncate">
                                {p.nombre}
                              </p>
                              {p.ingredientes && (
                                <p className="text-xs text-[#5c0f1b]/70 truncate">
                                  {p.ingredientes}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-black text-[#5c0f1b] shrink-0">
                              S/. {Number(p.precio).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => {
                          navigate(`/catalogo?search=${encodeURIComponent(debouncedQuery)}`)
                          setSearchOpen(false)
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#5c0f1b]/5 hover:bg-[#5c0f1b]/10 text-sm font-black text-[#5c0f1b] transition-colors border-t border-stone-100"
                      >
                        {hasMoreResults
                          ? `Ver los ${allMatches.length} resultados`
                          : 'Ver en catálogo'}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-7 px-4">
                      <PackageX className="h-7 w-7 text-stone-300" />
                      <p className="text-sm font-bold text-stone-400 text-center">
                        No encontramos trufas con «{debouncedQuery}»
                      </p>
                      <p className="text-xs text-stone-300 text-center">
                        Intenta con otro sabor o ingrediente
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Acciones derechas */}
          <div className="flex items-center gap-3 md:gap-4">
            {/* CriptoTrufas balance */}
            {isAuthenticated && (
              <Link
                to="/puntos"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full select-none transition-all cursor-pointer no-underline text-inherit ${
                  isPuntosPage ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                <Star className="h-4 w-4 fill-[#ff7a45] text-[#ff7a45]" />
                <span className={`text-sm font-black ${
                  isPuntosPage ? 'text-white' : 'text-white'
                }`}>
                  {saldoActual.toLocaleString()} pts
                </span>
              </Link>
            )}

            {/* Notificaciones (M14) */}
            {isAuthenticated && <NotificationBell />}

            {/* Carrito */}
            <button
              id="hp-cart-btn"
              onClick={() => navigate('/carrito')}
              className={`relative p-2 rounded-full transition-colors ${
                isCartPage
                  ? 'text-white bg-white/20'
                  : 'text-white/70 hover:text-white'
              }`}
              aria-label="Carrito"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#ff7a45] text-white text-[9px] font-black h-4 w-4 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Dashboard button for admin/staff users */}
            {isAuthenticated && user && user.role !== 'customer' && (
              <button
                id="hp-dashboard-btn"
                onClick={() => navigate('/dashboard')}
                className="flex h-9 items-center gap-2 px-3.5 rounded-full bg-white/15 text-white hover:bg-white/25 border border-white/25 transition-colors text-sm font-black shadow-md hover:scale-[1.02] active:scale-[0.98]"
                title="Panel de Administración"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}

            {/* Usuario */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    id="hp-user-btn"
                    onClick={onUserMenuToggle}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border font-black text-sm transition-colors overflow-hidden ${
                      isAccountPage || userMenuOpen
                        ? 'bg-white/25 border-white/35 text-white shadow-inner'
                        : 'bg-white/15 border-white/25 text-white hover:bg-white/25'
                    }`}
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : userName ? (
                      userName.charAt(0).toUpperCase()
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-[#5c0f1b]/10 overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-[#5c0f1b]/8">
                          <p className="text-xs text-[#2a1115]/50 font-semibold">Sesión activa</p>
                          <p className="text-sm font-black text-[#5c0f1b] truncate">{userName}</p>
                        </div>
                        {user && user.role !== 'customer' && (
                          <button
                            onClick={() => {
                              navigate('/dashboard')
                              onUserMenuToggle()
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors border-b border-[#5c0f1b]/8"
                          >
                            <LayoutDashboard className="h-4 w-4 text-[#ff7a45]" />
                            Panel de Administración
                          </button>
                        )}
                        <button
                          onClick={() => {
                            navigate('/mi-cuenta/perfil')
                            onUserMenuToggle()
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors"
                        >
                          <User className="h-4 w-4" />
                          Mi Perfil
                        </button>
                        <button
                          onClick={() => {
                            navigate('/mi-cuenta/pedidos')
                            onUserMenuToggle()
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors"
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Mis Pedidos
                        </button>
                        <button
                          onClick={onLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Cerrar sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  id="hp-login-btn"
                  onClick={() => navigate('/login')}
                  className="flex h-9 items-center gap-2 px-4 rounded-full bg-white/15 text-white hover:bg-white/25 border border-white/25 transition-colors text-sm font-black"
                >
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">Ingresar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <PublicNav />
      {/* ── Drawer de Navegación Móvil ── */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
              className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            />
            {/* Sliding Panel */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-72 max-w-full bg-[#faf8f5] h-full flex flex-col p-6 shadow-2xl overflow-y-auto"
            >
              {/* Header del drawer */}
              <div className="flex items-center justify-between pb-4 border-b border-[#5c0f1b]/10 mb-6">
                <span
                  className="font-black text-[#5c0f1b] text-xl"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  Mitrufely
                </span>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Buscador Móvil con Live Search */}
              <div className="relative mb-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!searchQuery.trim()) return
                    navigate(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`)
                    setSearchOpen(false)
                    setMobileNavOpen(false)
                  }}
                  className="relative w-full"
                >
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2a1115]/40 pointer-events-none" />
                  <input
                    type="text"
                    className="w-full bg-[#f0ede8] border border-stone-200 rounded-full px-4 pl-9 py-2.5 text-[#2a1115] text-sm font-medium placeholder:text-[#2a1115]/40 outline-none focus:border-[#5c0f1b]/30 focus:ring-2 focus:ring-[#5c0f1b]/10 transition-all"
                    placeholder="Buscar trufas, sabores..."
                    value={searchQuery}
                    onChange={(e) => {
                      onSearchChange(e.target.value)
                      setSearchOpen(true)
                    }}
                    onFocus={() => searchQuery.trim().length >= 2 && setSearchOpen(true)}
                    autoComplete="off"
                  />
                </form>

                {/* Dropdown de resultados en móvil */}
                <AnimatePresence>
                  {searchOpen && isSearched && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ duration: 0.16 }}
                      className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-[#5c0f1b]/10 overflow-hidden z-50"
                    >
                      {searchPreview.length > 0 ? (
                        <>
                          <ul className="divide-y divide-stone-100">
                            {searchPreview.map((p) => (
                              <li
                                key={p.id_producto}
                                onClick={() => {
                                  navigate(`/producto/${p.slug}`)
                                  setSearchOpen(false)
                                  setMobileNavOpen(false)
                                }}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#5c0f1b]/5 cursor-pointer transition-colors"
                              >
                                {p.imagen_url && (
                                  <img
                                    src={p.imagen_url}
                                    alt={p.nombre}
                                    className="h-10 w-10 rounded-xl object-cover shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-black text-[#2a1115] truncate">
                                    {p.nombre}
                                  </p>
                                  {p.ingredientes && (
                                    <p className="text-xs text-[#5c0f1b]/70 truncate">
                                      {p.ingredientes}
                                    </p>
                                  )}
                                </div>
                                <span className="text-sm font-black text-[#5c0f1b] shrink-0">
                                  S/. {Number(p.precio).toFixed(2)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => {
                              navigate(`/catalogo?search=${encodeURIComponent(debouncedQuery)}`)
                              setSearchOpen(false)
                              setMobileNavOpen(false)
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#5c0f1b]/5 hover:bg-[#5c0f1b]/10 text-sm font-black text-[#5c0f1b] transition-colors border-t border-stone-100 cursor-pointer"
                          >
                            {hasMoreResults
                              ? `Ver los ${allMatches.length} resultados`
                              : 'Ver en catálogo'}
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-7 px-4">
                          <PackageX className="h-7 w-7 text-stone-300" />
                          <p className="text-sm font-bold text-stone-400 text-center">
                            No encontramos trufas con «{debouncedQuery}»
                          </p>
                          <p className="text-xs text-stone-300 text-center">
                            Intenta con otro sabor o ingrediente
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Enlaces de navegación */}
              <nav className="flex-1 space-y-2">
                {[
                  { to: '/', label: 'Inicio', icon: Home },
                  { to: '/catalogo', label: 'Catálogo', icon: BookOpen },
                  { to: '/nosotros', label: 'Nosotros', icon: Users },
                  { to: '/puntos', label: 'Criptotrufas', icon: Award },
                ].map((link) => {
                  const Icon = link.icon
                  const isActive = window.location.pathname === link.to
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileNavOpen(false)}
                      className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-extrabold transition-all decoration-none ${
                        isActive
                          ? 'bg-[#5c0f1b] text-white shadow-md shadow-[#5c0f1b]/15'
                          : 'text-[#2a1115]/75 hover:text-[#5c0f1b] hover:bg-[#5c0f1b]/5'
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{link.label}</span>
                    </Link>
                  )
                })}
              </nav>

              {/* Footer del Drawer (Info de cuenta o login) */}
              <div className="pt-4 border-t border-[#5c0f1b]/10 flex flex-col gap-3">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-white border border-[#5c0f1b]/10 rounded-2xl shadow-xs">
                      <div className="h-10 w-10 rounded-lg bg-[#5c0f1b]/5 border border-[#5c0f1b]/10 flex items-center justify-center text-[#5c0f1b] font-black text-sm overflow-hidden">
                        {user?.avatarUrl ? (
                          <img src={user.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                        ) : userName ? (
                          userName.charAt(0).toUpperCase()
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-[#2a1115] truncate leading-snug">
                          {userName}
                        </p>
                        <span className="text-[10px] font-black text-[#ff7a45]">
                          {saldoActual.toLocaleString()} pts
                        </span>
                      </div>
                    </div>

                    {user && user.role !== 'customer' && (
                      <button
                        onClick={() => {
                          navigate('/dashboard')
                          setMobileNavOpen(false)
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors border-b border-[#5c0f1b]/8 cursor-pointer"
                      >
                        <LayoutDashboard className="h-4 w-4 text-[#ff7a45]" />
                        Panel de Administración
                      </button>
                    )}

                    <button
                      onClick={() => {
                        navigate('/mi-cuenta/perfil')
                        setMobileNavOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors cursor-pointer"
                    >
                      <User className="h-4 w-4" />
                      Mi Perfil
                    </button>

                    <button
                      onClick={() => {
                        navigate('/mi-cuenta/pedidos')
                        setMobileNavOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Mis Pedidos
                    </button>

                    <button
                      onClick={() => {
                        onLogout()
                        setMobileNavOpen(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-[#5c0f1b] hover:bg-[#5c0f1b]/5 transition-colors cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      navigate('/login')
                      setMobileNavOpen(false)
                    }}
                    className="w-full bg-[#5c0f1b] text-white hover:bg-[#7a1525] py-3 rounded-xl font-black text-sm transition-colors text-center block border-none cursor-pointer"
                  >
                    Ingresar a mi cuenta
                  </button>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
