import type { PullRequest } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { reminderMessage } from './reminder'

const NOW = new Date('2026-10-26T12:00:00Z')
const pr = (pendingReviewers: string[], daysAgo = 9) =>
  ({
    repository: 'acme/web-app',
    number: 1290,
    title: 'Migra a tabela de pedidos',
    url: 'https://github.com/acme/web-app/pull/1290',
    updatedAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    pendingReviewers,
  }) as PullRequest

describe('lembrete de PR parado', () => {
  it('cita quem tem a review pendente, há quanto tempo e o link', () => {
    expect(reminderMessage(pr(['ana-souza', 'time-pagamentos']), NOW)).toBe(
      [
        'Oi, @ana-souza, @time-pagamentos! Quando der, consegue dar uma olhada no acme/web-app#1290?',
        '"Migra a tabela de pedidos" está parado há 9 dias, esperando review.',
        'https://github.com/acme/web-app/pull/1290',
      ].join('\n'),
    )
  })

  it('sem revisor pendente, fala com o time', () => {
    expect(reminderMessage(pr([], 1), NOW)).toContain('Oi, pessoal!')
    expect(reminderMessage(pr([], 1), NOW)).toContain('há 1 dia')
  })
})
