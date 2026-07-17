import type { ReactNode } from 'react'
import { Suspense, lazy } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/query-client'
import { useAuthInit } from '@/features/auth/hooks/useAuthInit'
import { useAuthStore } from '@/app/store'

// Code-split: ReactQueryDevtools solo se carga en desarrollo
// Evita que colisione en el bundle de producción
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : () => null

interface ProvidersProps {
  children: ReactNode
}

/**
 * Componente interno que ejecuta la rehidratación del accessToken
 * y bloquea el render de rutas hasta que el proceso termine.
 * Evita que el router redirija a /login mientras se está recuperando la sesión.
 */
function AuthInitializer({ children }: ProvidersProps) {
  useAuthInit()
  const isInitialized = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '4px solid #e0c9a6',
            borderTopColor: '#b5451b',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return <>{children}</>
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthInitializer>
        {children}
      </AuthInitializer>
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          style: {
            fontFamily: 'var(--font-sans)',
          },
        }}
      />
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </Suspense>
      )}
    </QueryClientProvider>
  )
}
