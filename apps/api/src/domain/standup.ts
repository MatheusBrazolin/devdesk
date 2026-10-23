import type { StandupItem } from '@devdesk/shared'
import type { Activity, WorkRef } from './activity.js'
import { buildAttentionList } from './attention.js'
import type { PullRequest, WorkSnapshot } from './work.js'

const DAY_MS = 86_400_000
export const BLOCKED_AFTER_DAYS = 7

export interface StandupParts {
  done: StandupItem[]
  today: StandupItem[]
  blockers: StandupItem[]
}

const item = (
  kind: StandupItem['kind'],
  ref: WorkRef,
  detail: string | null = null,
): StandupItem => ({
  kind,
  title: ref.title,
  url: ref.url,
  repository: ref.repository,
  number: ref.number,
  detail,
})

const VERDICT_LABEL = {
  approved: 'aprovado',
  changes_requested: 'pediu mudanças',
  commented: 'comentou',
}

/** Um PR aberto que espera os outros: sem motivo de atenção seu e parado há dias. */
function waitingDays(pr: PullRequest, now: Date): number {
  return Math.floor((now.getTime() - pr.updatedAt.getTime()) / DAY_MS)
}

/**
 * Monta o standup. "Feito" vem da atividade do período; "hoje" é a lista do
 * que precisa da sua atenção; "bloqueios" são seus PRs parados esperando
 * review. Um item aparece numa seção só.
 */
export function buildStandup(activity: Activity, snapshot: WorkSnapshot, now: Date): StandupParts {
  const done = [
    ...activity.merged.map((ref) => item('merged', ref)),
    ...activity.opened
      // Aberto e mergeado no mesmo período: conta só o merge.
      .filter((ref) => !activity.merged.some((m) => m.url === ref.url))
      .map((ref) => item('opened', ref)),
    ...activity.reviewed.map((ref) => item('reviewed', ref, VERDICT_LABEL[ref.verdict])),
    ...activity.closedIssues.map((ref) => item('closed_issue', ref)),
  ]

  const attention = buildAttentionList(snapshot)
  const today = attention.map(({ reason, pullRequest }) =>
    item(
      reason,
      pullRequest,
      reason === 'review_requested' && pullRequest.author ? `de ${pullRequest.author.login}` : null,
    ),
  )

  const inAttention = new Set(attention.map((a) => a.pullRequest.url))
  const blockers = snapshot.authored
    .filter(
      (pr) => !pr.isDraft && !inAttention.has(pr.url) && waitingDays(pr, now) > BLOCKED_AFTER_DAYS,
    )
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .map((pr) => item('waiting_review', pr, `há ${waitingDays(pr, now)} dias`))

  return { done, today, blockers }
}
