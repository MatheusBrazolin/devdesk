import type { Dashboard } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { githubTokenQuery } from '@/features/settings/queries'
import { TokenConnectForm, TokenSteps } from '@/features/settings/token-connect'
import { t } from '@/lib/i18n'

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
 * organização que bloqueia apps de terceiros. O passo para resolver fica aqui
 * mesmo: gerar o token no GitHub e colar, que conecta sozinho e recarrega o
 * painel, sem pedir nada à organização.
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
      aria-label={t('Conectar o GitHub da empresa')}
      className="shrink-0 space-y-3 rounded-lg border border-accent/30 bg-accent/8 px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 size-4 shrink-0 text-accent" />
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-muted">
          <span className="font-medium text-fg">{t('Não veio nada do seu GitHub?')}</span>{' '}
          {t(
            'Se o seu trabalho fica numa organização que bloqueia apps de terceiros, o login sozinho não enxerga o que é dela. Com um token pessoal, tudo aparece aqui, sem pedir nada à organização. Leva um minuto, uma vez só.',
          )}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('Fechar')}
          className="rounded p-0.5 text-fg-subtle hover:text-fg"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="space-y-3 pl-7">
        <TokenSteps />
        <TokenConnectForm id="token-pessoal-hoje" />
        <p className="text-[12px] text-fg-subtle">
          {t('Fica cifrado e só serve para ler. Dá para remover em')}{' '}
          <Link to="/configuracoes" className="underline underline-offset-2 hover:text-fg-muted">
            {t('Configurações')}
          </Link>
          .
        </p>
      </div>
    </aside>
  )
}
