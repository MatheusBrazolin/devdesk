import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/time'
import { dashboardQuery, useRefreshDashboard } from './queries'

/** "Atualizado há 2 min" e o botão de buscar de novo. */
export function SyncStatus() {
  const { data, isFetching } = useQuery(dashboardQuery)
  const refresh = useRefreshDashboard()
  const busy = isFetching || refresh.isPending
  const now = useNow(30_000)

  return (
    <div className="flex items-center gap-2 text-[12px] text-fg-subtle">
      {data && (
        <span aria-live="polite">
          {data.isSample ? 'Dados de exemplo' : 'Do GitHub'} · atualizado{' '}
          {formatRelative(new Date(data.fetchedAt), now)}
        </span>
      )}
      <button
        type="button"
        disabled={busy}
        aria-label="Atualizar agora"
        title="Atualizar agora"
        onClick={() =>
          refresh.mutate(undefined, {
            onError: (error) =>
              toast.error('Não foi possível atualizar', { description: error.message }),
          })
        }
        className="grid size-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-fg disabled:opacity-50"
      >
        <RefreshCw className={cn('size-3.5', busy && 'animate-spin')} />
      </button>
    </div>
  )
}

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
