import { useState } from 'react'
import { Wrench, Mail, Facebook, Instagram, RefreshCw, Clock, Sparkles, ExternalLink, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { useMaintenanceStore } from '@/stores/maintenance.store'
import { PublicFooter } from '@/shared/components/layout/PublicFooter'

export function MaintenancePage() {
  const [isRetrying, setIsRetrying] = useState(false)
  const setMaintenance = useMaintenanceStore((s) => s.setMaintenance)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await api.get('/health', { timeout: 4000 })
      setMaintenance(false)
      toast.success('¡Servidores reconectados exitosamente!')
    } catch {
      toast.error('El servidor sigue en mantenimiento. Inténtalo nuevamente en unos minutos.')
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2a1115] font-sans antialiased flex flex-col justify-between selection:bg-[#ff7a45] selection:text-white">
      {/* Header Estilo Cliente sin bordes con Sombra */}
      <header className="bg-[#5c0f1b] text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
          <a
            href="https://mitrufely-dev.vercel.app/"
            className="flex items-center gap-2 group decoration-none text-white"
          >
            <span
              className="font-black text-2xl md:text-3xl tracking-tight select-none group-hover:text-[#ff7a45] transition-colors"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Mitrufely
            </span>
          </a>

          <div className="flex items-center gap-2 bg-white/12 px-4 py-1.5 rounded-full text-xs font-black text-white shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-[#ff7a45] animate-pulse" />
            <span>Mantenimiento en curso</span>
          </div>
        </div>
      </header>

      {/* Hero Central estilo tarjeta elevada con sombra sin bordes */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white p-8 sm:p-14 rounded-[40px] shadow-2xl shadow-[#5c0f1b]/12 w-full space-y-8 relative overflow-hidden"
        >
          {/* Adorno superior suave en gradiente */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-[#5c0f1b] via-[#ff7a45] to-[#5c0f1b]" />

          {/* Icono Principal flotante con Sombra */}
          <div className="mx-auto h-24 w-24 rounded-full bg-[#faf8f5] shadow-inner flex items-center justify-center text-[#5c0f1b]">
            <Wrench className="h-12 w-12 text-[#5c0f1b] animate-bounce" />
          </div>

          {/* Textos Informativos */}
          <div className="space-y-4 max-w-2xl mx-auto">
            <span className="text-xs font-black bg-[#ff7a45]/15 px-3.5 py-1 rounded-full text-[#c44a1a] uppercase tracking-wider shadow-sm">
              Servidor Temporalmente Desactivado
            </span>
            
            <h2
              className="text-3xl sm:text-4xl font-black text-[#5c0f1b] tracking-tight mt-2"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              ¡Oops! Este proyecto se encuentra en mantenimiento
            </h2>
            
            <p className="text-stone-600 font-medium text-sm sm:text-base leading-relaxed">
              Estamos realizando la migración de servidores y la optimización de los servicios de back-end. Puedes volver al portafolio principal de <strong className="text-[#5c0f1b]">Mitrufely Dev</strong> para explorar más aplicaciones y proyectos.
            </p>
          </div>

          {/* Grupo de Acciones: Ir al Portafolio y Reintentar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <a
              href="https://mitrufely-dev.vercel.app/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#5c0f1b] text-white hover:bg-[#7a1525] px-8 py-4 rounded-full text-sm font-black shadow-xl shadow-[#5c0f1b]/25 transition-all hover:scale-105 active:scale-95 text-center decoration-none"
            >
              <ArrowLeft className="h-4.5 w-4.5 text-[#ff7a45]" />
              Volver al Portafolio Principal
              <ExternalLink className="h-4 w-4 ml-1 opacity-80" />
            </a>

            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#faf8f5] text-[#5c0f1b] hover:bg-stone-100 px-7 py-4 rounded-full text-sm font-black shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 border-none cursor-pointer"
            >
              <RefreshCw className={`h-4.5 w-4.5 text-[#ff7a45] ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Comprobando...' : 'Reintentar Conexión'}
            </button>
          </div>

          {/* Tarjeta de Datos de Contacto Directo con Sombra Suave */}
          <div className="bg-[#faf8f5] p-6 sm:p-8 rounded-3xl shadow-md text-left space-y-6">
            <h3
              className="text-base font-black text-[#5c0f1b] uppercase tracking-wider text-center"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              ¿Necesitas contactarte con el equipo?
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* Correo y Horario */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#5c0f1b] text-white flex items-center justify-center shrink-0 shadow-md">
                    <Mail className="h-5 w-5 text-[#ff7a45]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Correo Oficial</span>
                    <a href="mailto:mitrufely.dev@gmail.com" className="text-xs sm:text-sm font-extrabold text-[#5c0f1b] hover:underline">
                      mitrufely.dev@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-[#5c0f1b] text-white flex items-center justify-center shrink-0 shadow-md">
                    <Clock className="h-5 w-5 text-[#ff7a45]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Horario de Atención</span>
                    <span className="text-xs sm:text-sm font-extrabold text-stone-700">
                      Lunes a Sábado: 9:00 am — 7:00 pm
                    </span>
                  </div>
                </div>
              </div>

              {/* Redes Sociales Oficiales */}
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-400 block">Síguenos en Redes</span>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="https://www.facebook.com/profile.php?id=61591210353721"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-xs font-black text-[#5c0f1b] hover:bg-[#5c0f1b] hover:text-white transition-all shadow-md"
                  >
                    <Facebook className="h-4 w-4 text-[#ff7a45]" />
                    Facebook
                  </a>
                  <a
                    href="https://www.instagram.com/mitrufely.dev/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-xs font-black text-[#5c0f1b] hover:bg-[#5c0f1b] hover:text-white transition-all shadow-md"
                  >
                    <Instagram className="h-4 w-4 text-[#ff7a45]" />
                    Instagram
                  </a>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer Público Completo del Cliente */}
      <PublicFooter />
    </div>
  )
}
