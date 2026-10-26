import { Search, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef } from 'react'
import { Kbd } from '@/components/ui/kbd'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { cn } from '@/lib/cn'
import type { ListFilter, SortOrder } from './list-filters'

export interface ToolbarValue extends ListFilter {
  ordem?: SortOrder
}

interface ListToolbarProps {
  value: ToolbarValue
  onChange: (patch: Partial<ToolbarValue>) => void
  owners: { owner: string; count: number }[]
  total: number
  /** Esconde a ordenação onde ela não faz sentido. */
  sortable?: boolean
  /** Ordens oferecidas e a que vale sem escolha (fica fora da URL). */
  orders?: SortOrder[]
  defaultOrder?: SortOrder
}

const SORT_LABELS: Record<SortOrder, string> = {
  prioridade: 'Prioridade de review',
  recentes: 'Atualizados recentemente',
  antigos: 'Parados há mais tempo',
  repositorio: 'Por repositório',
}

/** Busca, filtro por organização e ordenação. O estado vive na URL. */
export function ListToolbar({
  value,
  onChange,
  owners,
  total,
  sortable = true,
  orders = ['recentes', 'antigos', 'repositorio'],
  defaultOrder = 'recentes',
}: ListToolbarProps) {
  const input = useRef<HTMLInputElement>(null)

  // "/" foca a busca, como no GitHub.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        event.key !== '/' ||
        target.isContentEditable ||
        ['INPUT', 'TEXTAREA'].includes(target.tagName)
      )
        return
      event.preventDefault()
      input.current?.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex h-8 flex-1 items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-fg-subtle" />
          <span className="sr-only">Buscar</span>
          <input
            ref={input}
            type="search"
            value={value.q ?? ''}
            onChange={(event) => onChange({ q: event.target.value || undefined })}
            onKeyDown={(event) => event.key === 'Escape' && onChange({ q: undefined })}
            placeholder="Buscar por título, repositório ou número"
            className="h-full w-full rounded-md border border-border bg-surface pr-8 pl-8 text-[13px] placeholder:text-fg-subtle focus:border-border-strong focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {value.q ? (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => onChange({ q: undefined })}
              className="absolute right-2 grid size-5 place-items-center rounded text-fg-subtle hover:text-fg"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd className="absolute right-2 hidden sm:inline-flex">/</Kbd>
          )}
        </label>

        {sortable && (
          <label className="flex h-8 items-center">
            <span className="sr-only">Ordenar</span>
            <select
              value={value.ordem ?? defaultOrder}
              onChange={(event) =>
                onChange({
                  ordem:
                    event.target.value === defaultOrder
                      ? undefined
                      : (event.target.value as SortOrder),
                })
              }
              className="h-full rounded-md border border-border bg-surface px-2.5 text-[13px] text-fg-muted hover:border-border-strong focus:outline-none"
            >
              {orders.map((order) => (
                <option key={order} value={order}>
                  {SORT_LABELS[order]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {owners.length > 1 && (
        <div role="group" aria-label="Filtrar por organização" className="flex flex-wrap gap-1.5">
          <OwnerChip active={!value.org} onClick={() => onChange({ org: undefined })} count={total}>
            Todas
          </OwnerChip>
          {owners.map(({ owner, count }) => (
            <OwnerChip
              key={owner}
              active={value.org === owner}
              count={count}
              onClick={() => onChange({ org: value.org === owner ? undefined : owner })}
            >
              <OwnerAvatar owner={owner} />
              {owner}
            </OwnerChip>
          ))}
        </div>
      )}
    </div>
  )
}

function OwnerChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean
  count: number
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-7 items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors',
        active
          ? 'border-border-strong bg-elevated font-medium text-fg'
          : 'border-border text-fg-muted hover:border-border-strong hover:text-fg',
      )}
    >
      {children}
      <span className="font-mono text-[11px] text-fg-subtle">{count}</span>
    </button>
  )
}
