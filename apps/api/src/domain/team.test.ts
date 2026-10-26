import { describe, expect, it } from 'vitest'
import { computeTeam, type TeamPullRequest, teamRepositories } from './team.js'

const now = new Date('2026-10-26T12:00:00Z')
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000)

let seq = 0
function pr(data: Partial<TeamPullRequest> = {}): TeamPullRequest {
  seq += 1
  return {
    id: `PR_${seq}`,
    number: seq,
    title: `PR ${seq}`,
    url: `https://github.com/acme/web/pull/${seq}`,
    repository: 'acme/web',
    author: { login: 'ana', avatarUrl: null },
    isDraft: false,
    createdAt: hoursAgo(10),
    updatedAt: hoursAgo(1),
    approved: false,
    reviews: 0,
    pendingReviewers: [],
    lines: 100,
    ...data,
  }
}

describe('computeTeam', () => {
  it('conta abertos, sem review e parados, ignorando rascunhos', () => {
    const team = computeTeam(
      [
        pr({ reviews: 1 }),
        pr({ updatedAt: hoursAgo(80) }),
        pr({ approved: true, reviews: 2 }),
        pr({ isDraft: true }),
      ],
      ['acme/web'],
      now,
    )
    expect(team.totals).toEqual({ open: 3, withoutReview: 1, stale: 1, medianHoursWaiting: 10 })
  })

  it('a fila põe quem espera há mais tempo primeiro e deixa os aprovados de fora', () => {
    const team = computeTeam(
      [
        pr({ title: 'novo', createdAt: hoursAgo(2) }),
        pr({ title: 'velho', createdAt: hoursAgo(50) }),
        pr({ title: 'aprovado', approved: true, createdAt: hoursAgo(90) }),
      ],
      [],
      now,
    )
    expect(team.queue.map((item) => [item.title, item.waitingHours])).toEqual([
      ['velho', 50],
      ['novo', 2],
    ])
  })

  it('soma as reviews pendentes por pessoa e por time', () => {
    const team = computeTeam(
      [
        pr({ pendingReviewers: ['bia', 'time-web'] }),
        pr({ pendingReviewers: ['bia'] }),
        pr({ pendingReviewers: ['caio'], isDraft: true }),
      ],
      [],
      now,
    )
    expect(team.reviewLoad).toEqual([
      { reviewer: 'bia', pending: 2 },
      { reviewer: 'time-web', pending: 1 },
    ])
  })
})

describe('teamRepositories', () => {
  it('ordena pelos repositórios em que a pessoa mais aparece', () => {
    expect(
      teamRepositories({
        authored: [{ repository: 'acme/a' }, { repository: 'acme/b' }],
        reviewRequested: [{ repository: 'acme/b' }],
        merged: [{ repository: 'acme/c' }, { repository: 'acme/b' }],
      }),
    ).toEqual(['acme/b', 'acme/a', 'acme/c'])
  })
})
