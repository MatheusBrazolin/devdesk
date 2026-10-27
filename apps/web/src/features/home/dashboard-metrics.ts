import type { Issue, PullRequest } from '@devdesk/shared'
import { addDaysToKey, dateKey } from '@/lib/calendar-dates'
import { daysSince, ownerOf, STALE_AFTER_DAYS } from '@/features/work/list-filters'
import { t } from '@/lib/i18n'

export interface DayCount {
  day: string
  count: number
}

/** Quantos PRs foram mergeados em cada um dos últimos `days` dias, no fuso local. */
export function mergedPerDay(merged: PullRequest[], today: string, days = 7): DayCount[] {
  const counts = new Map<string, number>()
  for (const pr of merged) {
    if (!pr.mergedAt) continue
    const day = dateKey(new Date(pr.mergedAt))
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return Array.from({ length: days }, (_, i) => {
    const day = addDaysToKey(today, i - days + 1)
    return { day, count: counts.get(day) ?? 0 }
  })
}

export interface AgeBucket {
  label: string
  count: number
  /** Faixas acima de 7 dias: o que está parado. */
  stale: boolean
}

/** Dias inteiros sem atividade; acima de STALE_AFTER_DAYS é "parado", como em isStale. */
const BUCKETS: { label: string; maxDays: number; stale: boolean }[] = [
  { label: t('até 1 dia'), maxDays: 1, stale: false },
  { label: t('2 a 3 dias'), maxDays: 3, stale: false },
  { label: t('4 a 7 dias'), maxDays: STALE_AFTER_DAYS, stale: false },
  { label: t('8 a 14 dias'), maxDays: 14, stale: true },
  { label: t('mais de 14 dias'), maxDays: Infinity, stale: true },
]

/**
 * Seus PRs abertos (sem rascunhos) pelo tempo sem atividade. Usa a mesma
 * regra de "parado" do resto do app, para os números baterem.
 */
export function ageBuckets(authored: PullRequest[], now: Date = new Date()): AgeBucket[] {
  const counts = BUCKETS.map((bucket) => ({ label: bucket.label, count: 0, stale: bucket.stale }))
  for (const pr of authored) {
    if (pr.isDraft) continue
    // Mesma contagem de dias inteiros de isStale: os números batem com as listas.
    const days = daysSince(pr.updatedAt, now)
    const index = BUCKETS.findIndex((bucket) => days <= bucket.maxDays)
    counts[index]!.count += 1
  }
  return counts
}

export interface OwnerLoad {
  owner: string
  pullRequests: number
  issues: number
}

/** PRs abertos e issues por organização, da mais carregada para a menos. */
export function loadByOwner(authored: PullRequest[], issues: Issue[]): OwnerLoad[] {
  const byOwner = new Map<string, OwnerLoad>()
  const get = (owner: string) => {
    if (!byOwner.has(owner)) byOwner.set(owner, { owner, pullRequests: 0, issues: 0 })
    return byOwner.get(owner)!
  }
  for (const pr of authored) get(ownerOf(pr.repository)).pullRequests += 1
  for (const issue of issues) get(ownerOf(issue.repository)).issues += 1
  return [...byOwner.values()].sort(
    (a, b) =>
      b.pullRequests + b.issues - (a.pullRequests + a.issues) || a.owner.localeCompare(b.owner),
  )
}
