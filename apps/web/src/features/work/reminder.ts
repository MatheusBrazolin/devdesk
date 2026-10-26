import type { PullRequest } from '@devdesk/shared'
import { daysSince } from './list-filters'

/**
 * Lembrete para quem revisa um PR parado: educado, curto e com o que a
 * pessoa precisa para agir (o link). Cita quem ainda tem a review pendente;
 * sem ninguém pendente, pede para o time.
 */
export function reminderMessage(
  pr: Pick<
    PullRequest,
    'repository' | 'number' | 'title' | 'url' | 'updatedAt' | 'pendingReviewers'
  >,
  now: Date = new Date(),
): string {
  const days = daysSince(pr.updatedAt, now)
  const who = pr.pendingReviewers.length
    ? pr.pendingReviewers.map((name) => `@${name}`).join(', ')
    : 'pessoal'
  const since = days === 1 ? 'há 1 dia' : `há ${days} dias`
  return [
    `Oi, ${who}! Quando der, consegue dar uma olhada no ${pr.repository}#${pr.number}?`,
    `"${pr.title}" está parado ${since}, esperando review.`,
    pr.url,
  ].join('\n')
}
