import { useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { t } from './i18n'

/**
 * Avisa quando sai uma versão nova do DevDesk numa aba que ficou aberta: sem
 * isso, ela segue com o código antigo até alguém recarregar. Compara o
 * script principal carregado com o que o servidor serve agora (o nome dele
 * tem o hash do build). No modo TV, que ninguém está usando, recarrega sozinha.
 */

const CHECK_EVERY_MS = 5 * 60_000
const TOAST_ID = 'nova-versao'

/** O script principal de um index.html do Vite ("/assets/index-<hash>.js"). */
export function entryScript(html: string): string | null {
  return /<script[^>]*type="module"[^>]*src="([^"]*\/assets\/[^"]+\.js)"/.exec(html)?.[1] ?? null
}

/** O script principal que esta aba está rodando. */
function loadedScript(): string | null {
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]')
  return script ? new URL(script.src).pathname : null
}

async function servedScript(): Promise<string | null> {
  try {
    const response = await fetch('/', { cache: 'no-store', headers: { accept: 'text/html' } })
    return response.ok ? entryScript(await response.text()) : null
  } catch {
    // Sem rede ou servidor acordando: tenta na próxima.
    return null
  }
}

export function useUpdateCheck(): void {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const tv = pathname === '/tv'

  useEffect(() => {
    // Em desenvolvimento o Vite já troca o código sozinho.
    if (import.meta.env.DEV) return
    const current = loadedScript()
    if (!current) return

    let notified = false
    const check = async () => {
      if (notified) return
      const served = await servedScript()
      if (!served || served === current) return
      notified = true
      if (tv) return window.location.reload()
      toast(t('Nova versão do DevDesk disponível'), {
        id: TOAST_ID,
        description: t('Recarregue para usar a versão mais nova.'),
        duration: Number.POSITIVE_INFINITY,
        action: { label: t('Recarregar'), onClick: () => window.location.reload() },
      })
    }
    const onVisible = () => document.visibilityState === 'visible' && void check()

    const id = window.setInterval(() => void check(), CHECK_EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [tv])
}
