import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Package, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  useNotificationsQuery,
  useUnreadNotificationsCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/useNotifications'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const { data: notifications } = useNotificationsQuery()
  const { data: unreadData } = useUnreadNotificationsCount()
  const markAsRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const unreadCount = unreadData?.unread_count || 0

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Auto-close on scroll to avoid misalignment
  useEffect(() => {
    if (!isOpen) return
    const handleScroll = () => {
      setIsOpen(false)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isOpen])

  const handleNotificationClick = (notif: any) => {
    if (!notif.is_read) {
      markAsRead.mutate(notif.id_notification)
    }
    setIsOpen(false)
    if (notif.related_entity_id && notif.related_entity_type === 'ORDER') {
      navigate(`/mi-cuenta/pedidos/${notif.related_entity_id}`)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative h-9 w-9 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer active:scale-95 ${
          isOpen
            ? 'text-white bg-white/25 shadow-inner'
            : 'text-white/75 hover:text-white hover:bg-white/15'
        }`}
        aria-label="Notificaciones"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-[#ff7a45] text-[10px] font-black text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop for easy dismissal */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 sm:hidden"
              aria-hidden="true"
            />

            {/* Responsive notification panel */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="fixed left-3 right-3 top-[62px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 max-w-sm sm:max-w-none sm:w-96 mx-auto sm:mx-0 bg-white rounded-2xl shadow-2xl border border-[#5c0f1b]/10 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-3.5 sm:p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-[#2a1115] text-sm">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span className="bg-[#ff7a45]/15 text-[#ff7a45] text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-xs font-bold text-[#5c0f1b] hover:text-[#ff7a45] transition-colors cursor-pointer flex items-center gap-1"
                      title="Marcar todas como leídas"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Marcar leídas</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors sm:hidden cursor-pointer"
                    aria-label="Cerrar notificaciones"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable list */}
              <div className="max-h-[min(65vh,380px)] overflow-y-auto overscroll-contain divide-y divide-stone-50">
                {!notifications || notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-stone-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-stone-400">No tienes notificaciones nuevas</p>
                  </div>
                ) : (
                  notifications.map((notif: any) => (
                    <div
                      key={notif.id_notification}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 sm:p-4 hover:bg-stone-50 transition-colors cursor-pointer flex gap-3 items-start ${
                        !notif.is_read ? 'bg-[#ff7a45]/5' : ''
                      }`}
                    >
                      <div
                        className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 ${
                          !notif.is_read
                            ? 'bg-white shadow-xs border border-[#ff7a45]/25 text-[#ff7a45]'
                            : 'bg-stone-100 text-stone-400'
                        }`}
                      >
                        <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs sm:text-sm mb-0.5 line-clamp-2 ${
                            !notif.is_read ? 'font-black text-[#2a1115]' : 'font-semibold text-[#2a1115]/70'
                          }`}
                        >
                          {notif.message}
                        </p>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          {new Date(notif.created_at).toLocaleDateString('es-PE', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {!notif.is_read && (
                        <div className="w-2 h-2 rounded-full bg-[#ff7a45] shrink-0 mt-1.5 ring-2 ring-[#ff7a45]/20" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
