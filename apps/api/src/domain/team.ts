import { median } from './metrics.js'

/**
 * Painel do time: os PRs abertos nos repositórios em que a pessoa trabalha,
 * quem espera review há mais tempo e com quem as reviews estão acumulando.
 * Função pura: recebe os fatos, devolve os números.
 */

export interface TeamPullRequest {
  id: string
  number: number
  title: string
  url: string
  repository: string
  author: { login: string; avatarUrl: string | null }
  isDraft: boolean
  createdAt: Date
  updatedAt: Date
  approved: boolean
  /** Reviews de outras pessoas (não do autor). */
  reviews: number
  /** Quem ainda tem review pedida: pessoas por login, times pelo nome. */
  pendingReviewers: string[]
  lines: number | null
}

export interface TeamQueueItem extends TeamPullRequest {
  waitingHours: number
}

export interface Team {
  repositories: string[]
  totals: {
    open: number
    /** Prontos e sem nenhuma review de outra pessoa ainda. */
    withoutReview: number
    /** Sem movimento há 3 dias ou mais. */
    stale: number
    /** Mediana de horas abertos, dos que esperam review. */
    medianHoursWaiting: number | null
  }
  /** Os que esperam review, do que espera há mais tempo para o mais novo. */
  queue: TeamQueueItem[]
  /** Reviews pedidas e ainda não feitas, por pessoa ou time. */
  reviewLoad: { reviewer: string; pending: number }[]
}

export const STALE_AFTER_DAYS = 3
const QUEUE_SIZE = 15
const LOAD_SIZE = 8
const HOUR = 3_600_000

export function computeTeam(prs: TeamPullRequest[], repositories: string[], now: Date): Team {
  const ready = prs.filter((pr) => !pr.isDraft)
  const waiting = ready.filter((pr) => !pr.approved)
  const hours = (pr: TeamPullRequest) => (now.getTime() - pr.createdAt.getTime()) / HOUR

  const load = new Map<string, number>()
  for (const pr of ready) {
    for (const reviewer of pr.pendingReviewers) load.set(reviewer, (load.get(reviewer) ?? 0) + 1)
  }

  return {
    repositories,
    totals: {
      open: ready.length,
      withoutReview: ready.filter((pr) => pr.reviews === 0 && !pr.approved).length,
      stale: ready.filter(
        (pr) => now.getTime() - pr.updatedAt.getTime() >= STALE_AFTER_DAYS * 24 * HOUR,
      ).length,
      medianHoursWaiting: median(waiting.map(hours)),
    },
    queue: waiting
      .map((pr) => ({ ...pr, waitingHours: Math.max(0, Math.round(hours(pr))) }))
      .sort((a, b) => b.waitingHours - a.waitingHours)
      .slice(0, QUEUE_SIZE),
    reviewLoad: [...load]
      .map(([reviewer, pending]) => ({ reviewer, pending }))
      .sort((a, b) => b.pending - a.pending || a.reviewer.localeCompare(b.reviewer))
      .slice(0, LOAD_SIZE),
  }
}

/** Os repositórios do time: onde a pessoa abriu, revisou ou mergeou, do mais frequente ao menos. */
export function teamRepositories(snapshot: {
  authored: { repository: string }[]
  reviewRequested: { repository: string }[]
  merged: { repository: string }[]
}): string[] {
  const counts = new Map<string, number>()
  for (const pr of [...snapshot.authored, ...snapshot.reviewRequested, ...snapshot.merged]) {
    counts.set(pr.repository, (counts.get(pr.repository) ?? 0) + 1)
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([repository]) => repository)
}
