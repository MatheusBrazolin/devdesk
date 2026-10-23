import { RefreshCw, Unplug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { GITHUB_LOGIN_URL, configQuery } from '@/features/auth/queries'
import { ApiRequestError } from '@/lib/api'

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul aria-busy="true" aria-label="Carregando" className="divide-y divide-border">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-start gap-3 px-4 py-3">
          <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
          <span className="flex-1 space-y-2">
            <Skeleton className="h-3.5" style={{ width: `${78 - ((index * 13) % 36)}%` }} />
            <Skeleton className="h-2.5 w-40" />
          </span>
          <Skeleton className="mt-0.5 h-5 w-16 shrink-0" />
        </li>
      ))}
    </ul>
  )
}

/** Erro ao montar o painel: oferece reconectar quando o problema é o token. */
export function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const reconnect = error instanceof ApiRequestError && error.code === 'GITHUB_RECONNECT'
  // No modo pessoal não há login a refazer: o token vem do .env.
  const personalMode = useQuery(configQuery).data?.personalTokenEnabled ?? false

  return (
    <div role="alert" className="flex flex-col items-start px-4 py-6">
      <Unplug className="mb-3 size-4 text-danger" strokeWidth={1.75} />
      <p className="text-[13px] font-medium">
        {reconnect
          ? 'O GitHub não aceitou mais o acesso'
          : 'Não deu para carregar os dados do GitHub'}
      </p>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-fg-muted">
        {!reconnect ? (
          error.message
        ) : personalMode ? (
          <>
            O token pessoal foi revogado ou venceu. Gere outro e rode{' '}
            <code className="font-mono">npm run setup:github</code>.
          </>
        ) : (
          'O token pode ter sido revogado ou expirado. Conecte a conta de novo para continuar.'
        )}
      </p>
      <div className="mt-4">
        {reconnect && personalMode ? null : reconnect ? (
          <Button onClick={() => window.location.assign(GITHUB_LOGIN_URL)}>
            Reconectar GitHub
          </Button>
        ) : (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw /> Tentar de novo
          </Button>
        )}
      </div>
    </div>
  )
}
