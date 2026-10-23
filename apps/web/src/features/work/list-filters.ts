import type { Issue, PullRequest } from '@devdesk/shared'

const DAY = 24 * 60 * 60 * 1000

/** Sem atividade há mais que isto, o item é considerado parado. */
export const STALE_AFTER_DAYS = 7

export type SortOrder = 'recentes' | 'antigos' | 'repositorio'

export interface ListFilter {
  /** Texto livre: título, repositório ou número. */
  q?: string
  /** Dono do repositório (organização ou usuário). */
  org?: string
}

type Item = Pick<PullRequest | Issue, 'title' | 'repository' | 'number' | 'updatedAt'>

export const ownerOf = (repository: string) => repository.split('/')[0] ?? repository

export function daysSince(iso: string, now: Date = new Date()): number {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY)
}

export const isStale = (item: Pick<Item, 'updatedAt'>, now: Date = new Date()) =>
  daysSince(item.updatedAt, now) > STALE_AFTER_DAYS

export function applyFilter<T extends Item>(items: T[], { q, org }: ListFilter): T[] {
  const needle = q?.trim().toLowerCase().replace(/^#/, '')
  return items.filter((item) => {
    if (org && ownerOf(item.repository) !== org) return false
    if (!needle) return true
    return (
      item.title.toLowerCase().includes(needle) ||
      item.repository.toLowerCase().includes(needle) ||
      String(item.number) === needle
    )
  })
}

export function applySort<T extends Item>(items: T[], order: SortOrder): T[] {
  const byUpdated = (a: T, b: T) => b.updatedAt.localeCompare(a.updatedAt)
  const sorted = [...items]
  switch (order) {
    case 'recentes':
      return sorted.sort(byUpdated)
    case 'antigos':
      return sorted.sort((a, b) => -byUpdated(a, b))
    case 'repositorio':
      return sorted.sort((a, b) => a.repository.localeCompare(b.repository) || byUpdated(a, b))
  }
}

/** Donos presentes na lista, com contagem, do mais frequente ao menos. */
export function ownerCounts(items: Pick<Item, 'repository'>[]): { owner: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const owner = ownerOf(item.repository)
    counts.set(owner, (counts.get(owner) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count || a.owner.localeCompare(b.owner))
}
