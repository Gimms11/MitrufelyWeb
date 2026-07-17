import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router'
import { LogOut, User, Lock, ShoppingBag, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/app/store'
import { useLogout } from '@/features/auth/hooks/useLogout'
import { PublicHeader } from '@/shared/components/layout/PublicHeader'
import { PublicFooter } from '@/shared/components/layout/PublicFooter'
import { useCartItemCount } from '@/features/cart/hooks/useCart'
import { toast } from 'sonner'

export function CustomerProfileLayout() {
  const { user, isAuthenticated } = useAuthStore()
  const logout = useLogout()
  const navigate = useNavigate()
  const cartCount = useCartItemCount()
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
  }

  const handleLogout = async () => {
    await logout()
    setLogoutModalOpen(false)
    setUserMenuOpen(false)
    toast.success('Sesión cerrada correctamente.')
    navigate('/')
  }

  const navLinks = [
    { to: '/mi-cuenta/perfil', icon: User, label: 'Información Personal' },
    { to: '/mi-cuenta/pedidos', icon: ShoppingBag, label: 'Mis Pedidos' },
    { to: '/mi-cuenta/seguridad', icon: Lock, label: 'Seguridad' },
  ]

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#5c0f1b] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8f5] text-[#2a1115] font-sans antialiased">
      <PublicHeader
        cartCount={cartCount}
        favoriteCount={0}
        coinsBalance={isAuthenticated && user ? user.sweetCoinsBalance : null}
        userName={isAuthenticated && user ? user.name : null}
        userMenuOpen={userMenuOpen}
        onUserMenuToggle={() => setUserMenuOpen((o) => !o)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearch}
        onLogout={() => setLogoutModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-10">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64 shrink-0">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#5c0f1b]/5">
              <nav className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                        isActive
                          ? 'bg-[#5c0f1b] text-white'
                          : 'text-[#2a1115]/70 hover:bg-stone-50 hover:text-[#5c0f1b]'
                      }`
                    }
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </NavLink>
                ))}

                <hr className="my-2 border-stone-100" />

                <button
                  onClick={() => setLogoutModalOpen(true)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors w-full text-left cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </main>

      <PublicFooter />

      {/* Logout Modal */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#5c0f1b]/10 text-center">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <LogOut className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-[#2a1115] mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
              ¿Cerrar Sesión?
            </h3>
            <p className="text-sm text-stone-600 mb-6 font-medium">
              Tendrás que volver a iniciar sesión para ver tus pedidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-stone-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-all cursor-pointer shadow-md"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
