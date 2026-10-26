import type { AttentionItem, PullRequest } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import {
  estimateMinutes,
  formatEstimate,
  formatWaiting,
  isOverdue,
  orderAttention,
  orderReviewQueue,
} from './review-queue'

const NOW = new Date('2026-10-26T12:00:00Z')
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()

const pr = (id: string, data: Partial<PullRequest> = {}) =>
  ({
    id,
    isDraft: false,
    createdAt: hoursAgo(100),
    reviewRequestedAt: hoursAgo(2),
    ciStatus: 'success',
    size: { additions: 300, deletions: 100, changedFiles: 8 },
    ...data,
  }) as PullRequest

describe('estimativa de review', () => {
  it('cresce com o tamanho, de 5 em 5 minutos, com teto', () => {
    expect(
      estimateMinutes(pr('a', { size: { additions: 10, deletions: 0, changedFiles: 1 } })),
    ).toBe(5)
    expect(
      estimateMinutes(pr('b', { size: { additions: 100, deletions: 50, changedFiles: 3 } })),
    ).toBe(35)
    expect(
      estimateMinutes(pr('c', { size: { additions: 5000, deletions: 0, changedFiles: 90 } })),
    ).toBe(120)
    expect(estimateMinutes(pr('d', { size: null }))).toBeNull()
  })

  it('fala em minutos, horas ou "2 h+"', () => {
    expect(formatEstimate(15)).toBe('~15 min')
    expect(formatEstimate(60)).toBe('~1 h')
    expect(formatEstimate(90)).toBe('~1 h 30 min')
    expect(formatEstimate(120)).toBe('2 h+')
  })
})

describe('espera', () => {
  it('conta do último pedido de review; sem ele, da abertura', () => {
    expect(isOverdue(pr('a', { reviewRequestedAt: hoursAgo(30) }), NOW)).toBe(true)
    expect(isOverdue(pr('b', { reviewRequestedAt: hoursAgo(3) }), NOW)).toBe(false)
    expect(isOverdue(pr('c', { reviewRequestedAt: null, createdAt: hoursAgo(48) }), NOW)).toBe(true)
  })

  it('fala em horas até um dia, depois em dias', () => {
    expect(formatWaiting(0.5)).toBe('pedida agora')
    expect(formatWaiting(5)).toBe('esperando há 5 h')
    expect(formatWaiting(50)).toBe('esperando há 2 d')
  })
})

describe('fila', () => {
  it('quem espera há mais tempo vem antes', () => {
    const queue = orderReviewQueue(
      [
        pr('nova', { reviewRequestedAt: hoursAgo(1) }),
        pr('antiga', { reviewRequestedAt: hoursAgo(30) }),
      ],
      NOW,
    )
    expect(queue.map((p) => p.id)).toEqual(['antiga', 'nova'])
  })

  it('com espera parecida, o PR pequeno passa na frente', () => {
    const small = pr('pequeno', { size: { additions: 20, deletions: 5, changedFiles: 1 } })
    const big = pr('grande', { size: { additions: 900, deletions: 300, changedFiles: 30 } })
    expect(orderReviewQueue([big, small], NOW).map((p) => p.id)).toEqual(['pequeno', 'grande'])
  })

  it('CI quebrado e rascunho ficam para depois', () => {
    const queue = orderReviewQueue(
      [pr('rascunho', { isDraft: true }), pr('ci-vermelho', { ciStatus: 'failure' }), pr('pronto')],
      NOW,
    )
    expect(queue.map((p) => p.id)).toEqual(['pronto', 'ci-vermelho', 'rascunho'])
  })

  it('a lista de atenção mantém os motivos e ordena só as reviews', () => {
    const items = [
      { reason: 'review_requested', pullRequest: pr('r1', { reviewRequestedAt: hoursAgo(1) }) },
      { reason: 'review_requested', pullRequest: pr('r2', { reviewRequestedAt: hoursAgo(40) }) },
      { reason: 'ci_failed', pullRequest: pr('meu') },
    ] as AttentionItem[]
    expect(orderAttention(items, NOW).map((i) => i.pullRequest.id)).toEqual(['r2', 'r1', 'meu'])
  })
})
