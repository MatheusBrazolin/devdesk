import type { Issue, PullRequest } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { ageBuckets, loadByOwner, mergedPerDay } from './dashboard-metrics'

const now = new Date(2026, 9, 23, 12, 0)
const daysAgo = (n: number, hour = 12) => new Date(2026, 9, 23 - n, hour).toISOString()

const pr = (overrides: Partial<PullRequest>): PullRequest => ({
  id: Math.random().toString(),
  number: 1,
  title: 'x',
  url: 'https://github.com/acme/app/pull/1',
  repository: 'acme/app',
  author: null,
  isDraft: false,
  createdAt: daysAgo(30),
  updatedAt: daysAgo(0),
  mergedAt: null,
  ciStatus: null,
  reviewDecision: null,
  mergeable: 'mergeable',
  approvals: 0,

  changesRequested: 0,
  size: null,
  reviewRequestedAt: null,
  pendingReviewers: [],
  comments: 0,
  milestone: null,
  ...overrides,
})

describe('mergedPerDay', () => {
  it('conta por dia local nos últimos 7 dias, com zero nos dias sem merge', () => {
    const merged = [
      pr({ mergedAt: daysAgo(0) }),
      pr({ mergedAt: daysAgo(0, 9) }),
      pr({ mergedAt: daysAgo(3) }),
    ]
    const days = mergedPerDay(merged, '2026-10-23')
    expect(days).toHaveLength(7)
    expect(days[0]?.day).toBe('2026-10-17')
    expect(days.at(-1)).toEqual({ day: '2026-10-23', count: 2 })
    expect(days.find((d) => d.day === '2026-10-20')?.count).toBe(1)
    expect(days.reduce((sum, d) => sum + d.count, 0)).toBe(3)
  })

  it('ignora merges fora da janela', () => {
    expect(
      mergedPerDay([pr({ mergedAt: daysAgo(10) })], '2026-10-23').every((d) => d.count === 0),
    ).toBe(true)
  })
})

describe('ageBuckets', () => {
  it('distribui pelo tempo sem atividade e marca as faixas paradas', () => {
    const buckets = ageBuckets(
      [
        pr({ updatedAt: daysAgo(0) }),
        pr({ updatedAt: daysAgo(2) }),
        pr({ updatedAt: daysAgo(5) }),
        pr({ updatedAt: daysAgo(10) }),
        pr({ updatedAt: daysAgo(16) }),
        pr({ updatedAt: daysAgo(16), isDraft: true }),
      ],
      now,
    )
    expect(buckets.map((b) => [b.label, b.count, b.stale])).toEqual([
      ['até 1 dia', 1, false],
      ['2 a 3 dias', 1, false],
      ['4 a 7 dias', 1, false],
      ['8 a 14 dias', 1, true],
      ['mais de 14 dias', 1, true],
    ])
  })

  it('bate com a regra de "parado" do resto do app (dias inteiros)', () => {
    const at = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString()
    const stale = (days: number) =>
      ageBuckets([pr({ updatedAt: at(days) })], now)
        .filter((b) => b.stale)
        .reduce((sum, b) => sum + b.count, 0)
    expect(stale(7.5)).toBe(0) // 7 dias inteiros: ainda não está parado
    expect(stale(8)).toBe(1)
  })
})

describe('loadByOwner', () => {
  it('soma PRs e issues por organização, a mais carregada primeiro', () => {
    const issue = { repository: 'globex/api' } as Issue
    const load = loadByOwner(
      [
        pr({ repository: 'umbrella/workers' }),
        pr({ repository: 'umbrella/web' }),
        pr({ repository: 'globex/api' }),
      ],
      [issue],
    )
    expect(load).toEqual([
      { owner: 'globex', pullRequests: 1, issues: 1 },
      { owner: 'umbrella', pullRequests: 2, issues: 0 },
    ])
  })
})
