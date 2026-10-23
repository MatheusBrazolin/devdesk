import { describe, expect, it } from 'vitest'
import type { Activity } from './activity.js'
import { buildStandup } from './standup.js'
import type { PullRequest, WorkSnapshot } from './work.js'

const now = new Date('2026-10-23T12:00:00Z')
const days = (n: number) => new Date(now.getTime() - n * 86_400_000)
const ref = (n: number, title = `PR ${n}`) => ({
  title,
  url: `https://github.com/acme/app/pull/${n}`,
  repository: 'acme/app',
  number: n,
})
const pr = (n: number, overrides: Partial<PullRequest> = {}): PullRequest => ({
  ...ref(n),
  id: `PR_${n}`,
  author: { login: 'eu', avatarUrl: null },
  isDraft: false,
  createdAt: days(30),
  updatedAt: days(1),
  mergedAt: null,
  ciStatus: 'success',
  reviewDecision: null,
  mergeable: 'mergeable',
  approvals: 0,
  comments: 0,
  milestone: null,
  ...overrides,
})
const snapshot = (partial: Partial<WorkSnapshot>): WorkSnapshot => ({
  fetchedAt: now,
  isSample: false,
  reviewRequested: [],
  authored: [],
  merged: [],
  issues: [],
  totals: { reviewRequested: 0, authored: 0, merged: 0, issues: 0 },
  ...partial,
})
const noActivity: Activity = { merged: [], opened: [], reviewed: [], closedIssues: [] }

describe('buildStandup', () => {
  it('feito: mergeados, abertos, revisados e issues fechadas, nessa ordem', () => {
    const { done } = buildStandup(
      {
        merged: [ref(1)],
        opened: [ref(2)],
        reviewed: [{ ...ref(3), verdict: 'approved' }],
        closedIssues: [{ ...ref(4), url: 'https://github.com/acme/app/issues/4' }],
      },
      snapshot({}),
      now,
    )
    expect(done.map((i) => [i.kind, i.number, i.detail])).toEqual([
      ['merged', 1, null],
      ['opened', 2, null],
      ['reviewed', 3, 'aprovado'],
      ['closed_issue', 4, null],
    ])
  })

  it('aberto e mergeado no mesmo dia conta uma vez só, como merge', () => {
    const { done } = buildStandup(
      { ...noActivity, merged: [ref(1)], opened: [ref(1)] },
      snapshot({}),
      now,
    )
    expect(done.map((i) => i.kind)).toEqual(['merged'])
  })

  it('hoje: o que precisa da sua atenção, dizendo de quem é a review', () => {
    const review = pr(10, { author: { login: 'ana', avatarUrl: null } })
    const broken = pr(11, { ciStatus: 'failure' })
    const { today } = buildStandup(
      noActivity,
      snapshot({ reviewRequested: [review], authored: [broken] }),
      now,
    )
    expect(today.map((i) => [i.kind, i.detail])).toEqual([
      ['review_requested', 'de ana'],
      ['ci_failed', null],
    ])
  })

  it('bloqueios: seus PRs parados há mais de 7 dias, os mais antigos primeiro', () => {
    const { blockers } = buildStandup(
      noActivity,
      snapshot({
        authored: [
          pr(20, { updatedAt: days(10) }),
          pr(21, { updatedAt: days(16) }),
          pr(22, { updatedAt: days(2) }),
        ],
      }),
      now,
    )
    expect(blockers.map((i) => [i.number, i.detail])).toEqual([
      [21, 'há 16 dias'],
      [20, 'há 10 dias'],
    ])
  })

  it('PR que já está em "hoje" não se repete nos bloqueios', () => {
    const conflict = pr(30, { mergeable: 'conflicting', updatedAt: days(20) })
    const { today, blockers } = buildStandup(noActivity, snapshot({ authored: [conflict] }), now)
    expect(today.map((i) => i.number)).toEqual([30])
    expect(blockers).toEqual([])
  })

  it('rascunho parado não é bloqueio', () => {
    const { blockers } = buildStandup(
      noActivity,
      snapshot({ authored: [pr(40, { isDraft: true, updatedAt: days(30) })] }),
      now,
    )
    expect(blockers).toEqual([])
  })
})
