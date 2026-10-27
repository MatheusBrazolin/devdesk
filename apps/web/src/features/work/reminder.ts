import type { PullRequest } from '@devdesk/shared'
import { t } from '@/lib/i18n'
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
  const reference = `${pr.repository}#${pr.number}`
  const greeting = pr.pendingReviewers.length
    ? t('Oi, {quem}! Quando der, consegue dar uma olhada no {pr}?', {
        quem: pr.pendingReviewers.map((name) => `@${name}`).join(', '),
        pr: reference,
      })
    : t('Oi, pessoal! Quando der, consegue dar uma olhada no {pr}?', { pr: reference })
  const waiting = t(
    days === 1
      ? '"{titulo}" está parado há {n} dia, esperando review.'
      : '"{titulo}" está parado há {n} dias, esperando review.',
    { titulo: pr.title, n: days },
  )
  return [greeting, waiting, pr.url].join('\n')
}
