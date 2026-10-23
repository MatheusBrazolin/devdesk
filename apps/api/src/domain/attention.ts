import type { PullRequest, WorkSnapshot } from './work.js'

export type AttentionReason =
  'review_requested' | 'changes_requested' | 'ci_failed' | 'conflict' | 'ready_to_merge'

export interface AttentionItem {
  reason: AttentionReason
  pullRequest: PullRequest
}

/** Ordem de urgência: alguém esperando você vem antes do que só depende de você. */
const PRIORITY: Record<AttentionReason, number> = {
  review_requested: 0,
  changes_requested: 1,
  ci_failed: 2,
  conflict: 3,
  ready_to_merge: 4,
}

/**
 * Sem review obrigatória no repositório o GitHub não calcula a decisão (vem
 * nula). Aí valem as reviews em si: um pedido de mudança pesa mais que
 * qualquer aprovação, e só sem pedido de mudança uma aprovação basta.
 */
export const hasChangesRequested = (pr: PullRequest) =>
  pr.reviewDecision === 'changes_requested' ||
  (pr.reviewDecision === null && pr.changesRequested > 0)

export const isApproved = (pr: PullRequest) =>
  pr.reviewDecision === 'approved' ||
  (pr.reviewDecision === null && pr.approvals > 0 && pr.changesRequested === 0)

/**
 * O motivo mais urgente para um PR seu pedir atenção, ou nulo se ele está
 * só esperando os outros. Rascunho nunca pede atenção.
 */
export function reasonForAuthoredPullRequest(pr: PullRequest): AttentionReason | null {
  if (pr.isDraft) return null
  if (hasChangesRequested(pr)) return 'changes_requested'
  if (pr.ciStatus === 'failure') return 'ci_failed'
  if (pr.mergeable === 'conflicting') return 'conflict'
  if (
    isApproved(pr) &&
    pr.mergeable === 'mergeable' &&
    (pr.ciStatus === 'success' || pr.ciStatus === null)
  ) {
    return 'ready_to_merge'
  }
  return null
}

/**
 * Monta a lista "Precisa da sua atenção". Dentro do mesmo motivo, reviews
 * pedidas vêm da mais antiga para a mais nova (quem espera há mais tempo
 * primeiro); o resto, do mais recente para o mais antigo.
 */
export function buildAttentionList(snapshot: WorkSnapshot): AttentionItem[] {
  const items = new Map<string, AttentionItem>()

  for (const pr of snapshot.reviewRequested) {
    if (!pr.isDraft) items.set(pr.id, { reason: 'review_requested', pullRequest: pr })
  }
  for (const pr of snapshot.authored) {
    const reason = reasonForAuthoredPullRequest(pr)
    if (reason && !items.has(pr.id)) items.set(pr.id, { reason, pullRequest: pr })
  }

  return [...items.values()].sort((a, b) => {
    const byPriority = PRIORITY[a.reason] - PRIORITY[b.reason]
    if (byPriority !== 0) return byPriority
    const age = a.pullRequest.updatedAt.getTime() - b.pullRequest.updatedAt.getTime()
    return a.reason === 'review_requested' ? age : -age
  })
}
