import type { AttentionItem, PullRequest } from '@devdesk/shared'

/**
 * Fila de review: o que revisar primeiro. Pesa quanto tempo a pessoa está
 * esperando, se o PR é pequeno (destrava alguém rápido) e se o CI está verde
 * (não vale revisar o que ainda vai mudar). Rascunhos vão para o fim.
 */

const HOUR = 60 * 60 * 1000
/** Esperando mais que isto, a review está atrasada. */
export const OVERDUE_AFTER_HOURS = 24
/** Ritmo de leitura usado na estimativa: ~300 linhas por hora. */
const LINES_PER_MINUTE = 5

export const changedLines = (pr: Pick<PullRequest, 'size'>) =>
  pr.size ? pr.size.additions + pr.size.deletions : null

/** Desde quando a review espera: o último pedido ou, sem ele, a abertura do PR. */
export const waitingSince = (pr: Pick<PullRequest, 'reviewRequestedAt' | 'createdAt'>) =>
  new Date(pr.reviewRequestedAt ?? pr.createdAt)

export function hoursWaiting(
  pr: Pick<PullRequest, 'reviewRequestedAt' | 'createdAt'>,
  now: Date = new Date(),
): number {
  return Math.max(0, (now.getTime() - waitingSince(pr).getTime()) / HOUR)
}

export const isOverdue = (
  pr: Pick<PullRequest, 'reviewRequestedAt' | 'createdAt'>,
  now: Date = new Date(),
) => hoursWaiting(pr, now) > OVERDUE_AFTER_HOURS

/** Minutos estimados de review, em múltiplos de 5, de 5 a 120. Nulo sem tamanho. */
export function estimateMinutes(pr: Pick<PullRequest, 'size'>): number | null {
  const lines = changedLines(pr)
  if (lines === null) return null
  const raw = 5 + lines / LINES_PER_MINUTE
  return Math.min(120, Math.max(5, Math.round(raw / 5) * 5))
}

export function formatEstimate(minutes: number): string {
  if (minutes >= 120) return '2 h+'
  if (minutes < 60) return `~${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `~${hours} h ${rest} min` : `~${hours} h`
}

export function formatWaiting(hours: number): string {
  if (hours < 1) return 'pedida agora'
  if (hours < 24) return `esperando há ${Math.floor(hours)} h`
  return `esperando há ${Math.floor(hours / 24)} d`
}

/** Quanto maior, antes na fila. */
export function reviewPriority(pr: PullRequest, now: Date = new Date()): number {
  if (pr.isDraft) return -1000
  const lines = changedLines(pr)
  const small = lines === null ? 0 : lines < 100 ? 12 : lines < 400 ? 4 : 0
  const ci = pr.ciStatus === 'success' ? 4 : pr.ciStatus === 'failure' ? -8 : 0
  return hoursWaiting(pr, now) + small + ci
}

export function orderReviewQueue(prs: PullRequest[], now: Date = new Date()): PullRequest[] {
  return [...prs].sort((a, b) => reviewPriority(b, now) - reviewPriority(a, now))
}

/**
 * A lista de atenção na ordem da API (por motivo), com as reviews pedidas
 * na ordem da fila.
 */
export function orderAttention(items: AttentionItem[], now: Date = new Date()): AttentionItem[] {
  const reviews = items.filter((item) => item.reason === 'review_requested')
  const ordered = orderReviewQueue(
    reviews.map((item) => item.pullRequest),
    now,
  )
  const byId = new Map(reviews.map((item) => [item.pullRequest.id, item]))
  let next = 0
  return items.map((item) =>
    item.reason === 'review_requested' ? byId.get(ordered[next++]!.id)! : item,
  )
}
