import type { SortOrder } from './list-filters'

const SORT_ORDERS: SortOrder[] = ['recentes', 'antigos', 'repositorio']

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value : undefined)

export interface ListSearch {
  q?: string
  org?: string
  ordem?: SortOrder
}

/** Lê da URL os filtros de lista, ignorando o que não for válido. */
export function parseListSearch(search: Record<string, unknown>): ListSearch {
  return {
    q: text(search.q),
    org: text(search.org),
    ordem: SORT_ORDERS.find((order) => order === search.ordem),
  }
}
