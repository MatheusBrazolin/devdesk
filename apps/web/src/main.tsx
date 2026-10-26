import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { createAppRouter } from '@/app/router'
import { ThemeProvider, useTheme } from '@/lib/theme'
import '@/styles/app.css'
import { isUnauthenticated } from '@/lib/api'

/**
 * Sessão expirada no meio do uso: em vez de cada tela mostrar um erro, limpa
 * o cache e volta ao login. (No /login o 401 do /me é o esperado.)
 */
function onUnauthenticated(error: unknown) {
  if (!isUnauthenticated(error) || router.state.location.pathname === '/login') return
  queryClient.clear()
  void router.navigate({ to: '/login' })
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
  queryCache: new QueryCache({ onError: onUnauthenticated }),
  mutationCache: new MutationCache({ onError: onUnauthenticated }),
})
const router = createAppRouter(queryClient)

function ThemedToaster() {
  const { resolved } = useTheme()
  return <Toaster theme={resolved} position="bottom-right" />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* As animações do motion seguem a preferência de reduzir movimento do sistema. */}
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <ThemedToaster />
        </QueryClientProvider>
      </ThemeProvider>
    </MotionConfig>
  </StrictMode>,
)

// App instalável: o service worker só existe no build (em desenvolvimento o
// Vite troca o código sozinho e um cache só atrapalharia).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'))
}
