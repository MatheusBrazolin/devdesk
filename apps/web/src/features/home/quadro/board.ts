import type { Dashboard, PullRequest } from '@devdesk/shared'
import { daysSince, isStale } from '@/features/work/list-filters'

/** Situação que aparece na pílula do card. */
export type StatusTag =
  | 'conflict'
  | 'ci_failure'
  | 'changes_requested'
  | 'review_requested'
  | 'no_review'
  | 'approved'
  | 'draft'

export interface BoardCard {
  pullRequest: PullRequest
  tag: StatusTag
  /** Dias desde a abertura e desde o último movimento. */
  openedDays: number
  idleDays: number
}

export interface Board {
  needsYou: BoardCard[]
  stale: BoardCard[]
  inProgress: BoardCard[]
  /** Há review pedida a você? O rodapé de "Precisa de você" diz quando não há. */
  hasReviewRequests: boolean
}

/** Acima disto, "Em andamento" vira um card-resumo em vez da lista. */
export const IN_PROGRESS_LIST_LIMIT = 3

const changesRequested = (pr: PullRequest) =>
  pr.reviewDecision === 'changes_requested' || pr.changesRequested > 0

/**
 * O que trava um PR seu e só você resolve, do mais grave ao menos: conflito
 * (vale até em rascunho), CI quebrado e mudanças pedidas. Nada disso, null.
 */
function blockedTag(pr: PullRequest): StatusTag | null {
  if (pr.mergeable === 'conflicting') return 'conflict'
  if (pr.isDraft) return null
  if (pr.ciStatus === 'failure') return 'ci_failure'
  if (changesRequested(pr)) return 'changes_requested'
  return null
}

/** Ordem em "Precisa de você": o que trava seu PR vem antes das reviews. */
const URGENCY: Partial<Record<StatusTag, number>> = {
  conflict: 0,
  ci_failure: 1,
  changes_requested: 2,
  review_requested: 3,
}

/** A situação de um PR seu: o que mais pesa aparece. */
function authoredTag(pr: PullRequest): StatusTag {
  if (pr.isDraft) return 'draft'
  if (changesRequested(pr)) return 'changes_requested'
  if (pr.reviewDecision === 'approved' || pr.approvals > 0) return 'approved'
  return 'no_review'
}

/**
 * Os PRs do painel nas quatro colunas do quadro. Cada PR fica numa coluna só,
 * a mais urgente: pede ação sua (review pedida, ou PR seu com conflito, CI
 * quebrado ou mudanças pedidas) > parado há mais de 7 dias > em andamento.
 */
export function buildBoard(data: Dashboard, now: Date = new Date()): Board {
  const card = (pullRequest: PullRequest, tag: StatusTag): BoardCard => ({
    pullRequest,
    tag,
    openedDays: daysSince(pullRequest.createdAt, now),
    idleDays: daysSince(pullRequest.updatedAt, now),
  })
  const oldestFirst = (a: BoardCard, b: BoardCard) =>
    a.pullRequest.updatedAt.localeCompare(b.pullRequest.updatedAt)

  const reviews = data.pullRequests.reviewRequested.map((pr) => card(pr, 'review_requested'))
  const seen = new Set(reviews.map((c) => c.pullRequest.id))
  const mine = data.pullRequests.authored.filter((pr) => !seen.has(pr.id))

  const blocked = mine.flatMap((pr) => {
    const tag = blockedTag(pr)
    return tag ? [card(pr, tag)] : []
  })
  const needsYou = [...blocked, ...reviews].sort(
    (a, b) => (URGENCY[a.tag] ?? 9) - (URGENCY[b.tag] ?? 9) || oldestFirst(a, b),
  )
  const taken = new Set(needsYou.map((c) => c.pullRequest.id))

  const stale = mine
    .filter((pr) => !taken.has(pr.id) && !pr.isDraft && isStale(pr, now))
    .map((pr) => card(pr, authoredTag(pr)))
    .sort(oldestFirst)
  stale.forEach((c) => taken.add(c.pullRequest.id))

  const inProgress = mine
    .filter((pr) => !taken.has(pr.id))
    .map((pr) => card(pr, authoredTag(pr)))
    .sort((a, b) => b.pullRequest.updatedAt.localeCompare(a.pullRequest.updatedAt))

  return { needsYou, stale, inProgress, hasReviewRequests: reviews.length > 0 }
}

export interface AgeRow {
  label: string
  count: number
  /** A faixa de mais de 14 dias: vale destacar quando não está vazia. */
  warn: boolean
}

/** Seus PRs abertos (sem rascunhos) pela idade: até 1 dia, 2 a 14 dias, mais de 14. */
export function ageRows(authored: PullRequest[], now: Date = new Date()): Omit<AgeRow, 'label'>[] {
  const counts = [0, 0, 0]
  for (const pr of authored) {
    if (pr.isDraft) continue
    const days = daysSince(pr.createdAt, now)
    counts[days <= 1 ? 0 : days <= 14 ? 1 : 2]! += 1
  }
  return counts.map((count, index) => ({ count, warn: index === 2 && count > 0 }))
}
