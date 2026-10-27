import type { Dashboard } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { githubTokenQuery } from '@/features/settings/queries'

const DISMISSED = 'devdesk:dica-token'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED) === 'sim'
  } catch {
    return false
  }
}

/**
 * Painel todo zerado logo depois de entrar pelo GitHub costuma ser uma
 * organização que bloqueia apps de terceiros. A dica leva ao token pessoal,
 * que resolve sem pedir nada à organização.
 */
export function OrgAccessHint({ data, isDemo }: { data: Dashboard | undefined; isDemo: boolean }) {
  const token = useQuery({ ...githubTokenQuery, enabled: !isDemo })
  const [dismissed, setDismissed] = useState(wasDismissed)

  const empty =
    data !== undefined &&
    !data.isSample &&
    Object.values(data.summary).every((count) => count === 0)
  if (isDemo || dismissed || !empty || token.data?.connected !== false) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED, 'sim')
    } catch {
      // Sem armazenamento: a dica só some nesta visita.
    }
  }

  return (
    <aside
      aria-label="Dica de acesso ao GitHub"
      className="flex shrink-0 items-start gap-3 rounded-lg border border-accent/30 bg-accent/8 px-4 py-3"
    >
      <KeyRound className="mt-0.5 size-4 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-muted">
        <span className="font-medium text-fg">Não apareceu nada do seu GitHub?</span> Se o seu
        trabalho fica numa organização que bloqueia apps de terceiros, conecte um token pessoal em{' '}
        <Link to="/configuracoes" className="text-fg underline underline-offset-2">
          Configurações → Acesso ao GitHub
        </Link>
        . Leva um minuto e não pede nada à organização.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar a dica"
        className="rounded p-0.5 text-fg-subtle hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </aside>
  )
}
