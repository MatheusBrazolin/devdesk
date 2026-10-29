import type { Issue, PullRequest } from '@devdesk/shared'

const DAY = 24 * 60 * 60 * 1000

/** Sem atividade há mais que isto, o item é considerado parado. */
export const STALE_AFTER_DAYS = 7

/** "prioridade" só existe na aba de reviews; quem ordena é a fila (review-queue). */
export type SortOrder = 'prioridade' | 'recentes' | 'antigos' | 'repositorio'

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

/** Minúsculas e sem acento: "Paginação" e "paginacao" são a mesma busca. */
export const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Tudo em que a busca procura: título, repositório, "repo#número", autor e etiquetas. */
function haystack(item: Item): string {
  const extra = item as Partial<Pick<Issue, 'labels'>> & Partial<Pick<PullRequest, 'author'>>
  return fold(
    [
      item.title,
      `${item.repository}#${item.number}`,
      extra.author?.login ?? '',
      ...(extra.labels ?? []).map((label) => label.name),
    ].join(' '),
  )
}

/**
 * Cada palavra da busca precisa aparecer em algum lugar, em qualquer ordem:
 * "migra tabela" acha "Migra a tabela de pedidos". Um número sozinho
 * ("1290" ou "#1290") também acha pelo número.
 */
export function applyFilter<T extends Item>(items: T[], { q, org }: ListFilter): T[] {
  const words = fold(q ?? '')
    .split(/\s+/)
    .map((word) => word.replace(/^#/, ''))
    .filter(Boolean)
  return items.filter((item) => {
    if (org && ownerOf(item.repository) !== org) return false
    if (words.length === 0) return true
    if (words.length === 1 && String(item.number) === words[0]) return true
    const text = haystack(item)
    return words.every((word) => text.includes(word))
  })
}

export function applySort<T extends Item>(items: T[], order: SortOrder): T[] {
  const byUpdated = (a: T, b: T) => b.updatedAt.localeCompare(a.updatedAt)
  const sorted = [...items]
  switch (order) {
    case 'prioridade':
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
