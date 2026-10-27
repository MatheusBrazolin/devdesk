import { MAX_TEAM_REPOSITORIES, repositoryNameSchema, type Settings } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { dashboardQuery } from '@/features/work/queries'
import { t } from '@/lib/i18n'
import { useSaveSettings } from './queries'

/**
 * Quem forma o painel do time. No automático, os repositórios saem dos seus
 * PRs e reviews; escolhendo, entram só os marcados (até 10).
 */
export function TeamSection({ settings }: { settings: Settings }) {
  const save = useSaveSettings()
  const dashboard = useQuery(dashboardQuery)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const chosen = settings.teamRepositories
  const fromWork = [
    ...(dashboard.data?.pullRequests.authored ?? []),
    ...(dashboard.data?.pullRequests.reviewRequested ?? []),
    ...(dashboard.data?.pullRequests.merged ?? []),
  ].map((pr) => pr.repository)
  const candidates = [...new Set([...(chosen ?? []), ...fromWork])].sort()

  const saveRepositories = (repositories: string[] | null) =>
    save.mutate(
      { ...settings, teamRepositories: repositories },
      { onError: (e) => toast.error(t('Não salvou'), { description: e.message }) },
    )

  const toggle = (repository: string, on: boolean) => {
    const current = chosen ?? []
    saveRepositories(on ? [...current, repository] : current.filter((r) => r !== repository))
  }

  const add = (event: FormEvent) => {
    event.preventDefault()
    const parsed = repositoryNameSchema.safeParse(draft)
    if (!parsed.success) return setError(t('Use o formato dono/repositorio.'))
    if ((chosen?.length ?? 0) >= MAX_TEAM_REPOSITORIES) {
      return setError(t('Dá para escolher até {max} repositórios.', { max: MAX_TEAM_REPOSITORIES }))
    }
    setError(null)
    setDraft('')
    if (!chosen?.includes(parsed.data)) saveRepositories([...(chosen ?? []), parsed.data])
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <div
        role="radiogroup"
        aria-label={t('Como escolher os repositórios')}
        className="flex gap-1.5"
      >
        {[
          { auto: true, label: t('Automático') },
          { auto: false, label: t('Escolher') },
        ].map((option) => {
          const active = option.auto === (chosen === null)
          return (
            <button
              key={option.label}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={save.isPending}
              onClick={() =>
                active ? undefined : saveRepositories(option.auto ? null : candidates.slice(0, 5))
              }
              className={
                active
                  ? 'rounded-md border border-border-strong bg-elevated px-3 py-1.5 text-[13px] font-medium'
                  : 'rounded-md border border-border px-3 py-1.5 text-[13px] text-fg-muted hover:text-fg'
              }
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {chosen === null ? (
        <p className="text-[13px] text-fg-muted">
          {t(
            'O time sai dos repositórios em que você abre, revisa ou mergeia PRs, do mais frequente ao menos.',
          )}
        </p>
      ) : (
        <>
          <ul aria-label={t('Repositórios')} className="grid gap-0.5 sm:grid-cols-2">
            {candidates.map((repository) => (
              <li key={repository}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 font-mono text-[12px] hover:bg-elevated/60">
                  <input
                    type="checkbox"
                    checked={chosen.includes(repository)}
                    disabled={
                      save.isPending ||
                      (!chosen.includes(repository) && chosen.length >= MAX_TEAM_REPOSITORIES)
                    }
                    onChange={(event) => toggle(repository, event.target.checked)}
                    className="accent-[var(--accent)]"
                  />
                  <span className="truncate">{repository}</span>
                </label>
              </li>
            ))}
          </ul>
          <form onSubmit={add} className="flex gap-2">
            <label className="sr-only" htmlFor="novo-repositorio">
              {t('Adicionar repositório')}
            </label>
            <input
              id="novo-repositorio"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('dono/repositorio')}
              spellCheck={false}
              autoComplete="off"
              className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 font-mono text-[12px] focus:border-border-strong focus:outline-none"
            />
            <Button type="submit" variant="outline" disabled={!draft.trim() || save.isPending}>
              <Plus /> {t('Adicionar')}
            </Button>
          </form>
          {error && (
            <p role="alert" className="text-[13px] text-danger">
              {error}
            </p>
          )}
          <p className="text-[12px] text-fg-subtle">
            {t(
              '{count} de {max}. Só leitura: o DevDesk só olha os PRs abertos desses repositórios.',
              { count: chosen.length, max: MAX_TEAM_REPOSITORIES },
            )}
          </p>
        </>
      )}
    </div>
  )
}
