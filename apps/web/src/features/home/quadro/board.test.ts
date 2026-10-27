import type { Dashboard, PullRequest } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { ageRows, buildBoard } from './board'

const now = new Date('2026-10-27T15:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000).toISOString()

let next = 0
function pr(overrides: Partial<PullRequest> = {}): PullRequest {
  next += 1
  return {
    id: `PR_${next}`,
    number: next,
    title: `PR ${next}`,
    url: `https://github.com/acme/web/pull/${next}`,
    repository: 'acme/web',
    author: null,
    isDraft: false,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    mergedAt: null,
    ciStatus: 'success',
    reviewDecision: 'review_required',
    mergeable: 'mergeable',
    approvals: 0,
    changesRequested: 0,
    comments: 0,
    milestone: null,
    size: null,
    reviewRequestedAt: null,
    pendingReviewers: [],
    ...overrides,
  }
}

function dashboard(prs: Partial<Dashboard['pullRequests']>): Dashboard {
  return {
    fetchedAt: now.toISOString(),
    isSample: false,
    stale: false,
    summary: { reviewRequested: 0, openPullRequests: 0, assignedIssues: 0, mergedThisWeek: 0 },
    attention: [],
    pullRequests: { reviewRequested: [], authored: [], merged: [], ...prs },
    issues: [],
  } as Dashboard
}

describe('buildBoard', () => {
  it('cada PR fica numa coluna só, a mais urgente', () => {
    const asked = pr()
    const changes = pr({ reviewDecision: 'changes_requested', updatedAt: daysAgo(10) })
    const idle = pr({ updatedAt: daysAgo(9) })
    const fresh = pr({ approvals: 1, reviewDecision: 'approved' })
    const draft = pr({ isDraft: true, updatedAt: daysAgo(20) })

    const board = buildBoard(
      dashboard({ reviewRequested: [asked], authored: [changes, idle, fresh, draft] }),
      now,
    )
    expect(board.needsYou.map((c) => [c.pullRequest.id, c.tag])).toEqual([
      [changes.id, 'changes_requested'],
      [asked.id, 'review_requested'],
    ])
    expect(board.stale.map((c) => [c.pullRequest.id, c.tag, c.idleDays])).toEqual([
      [idle.id, 'no_review', 9],
    ])
    expect(board.inProgress.map((c) => [c.pullRequest.id, c.tag])).toEqual([
      [fresh.id, 'approved'],
      [draft.id, 'draft'],
    ])
    expect(board.hasReviewRequests).toBe(true)
  })

  it('sem review pedida, o rodapé sabe', () => {
    expect(buildBoard(dashboard({ authored: [pr()] }), now).hasReviewRequests).toBe(false)
  })
})

describe('ageRows', () => {
  it('conta por idade, sem rascunhos, e destaca só mais de 14 dias com algo', () => {
    const rows = ageRows(
      [
        pr({ createdAt: daysAgo(0) }),
        pr({ createdAt: daysAgo(5) }),
        pr({ createdAt: daysAgo(14) }),
        pr({ createdAt: daysAgo(30) }),
        pr({ createdAt: daysAgo(30), isDraft: true }),
      ],
      now,
    )
    expect(rows).toEqual([
      { count: 1, warn: false },
      { count: 2, warn: false },
      { count: 1, warn: true },
    ])
  })
})
