import { describe, expect, it } from 'vitest'
import { milestoneDeadlines, repositoryOfMilestone } from './deadlines.js'
import type { Milestone, WorkSnapshot } from './work.js'

const sprint: Milestone = {
  title: 'Sprint 42',
  dueOn: '2026-10-27',
  url: 'https://github.com/acme/web/milestone/42',
}
const release: Milestone = {
  title: 'v2',
  dueOn: '2026-11-03',
  url: 'https://github.com/acme/api/milestone/7',
}
const noDate: Milestone = {
  title: 'Backlog',
  dueOn: null,
  url: 'https://github.com/acme/web/milestone/1',
}

const snapshot = (milestones: { authored?: (Milestone | null)[]; issues?: (Milestone | null)[] }) =>
  ({
    authored: (milestones.authored ?? []).map((milestone) => ({ milestone })),
    reviewRequested: [],
    issues: (milestones.issues ?? []).map((milestone) => ({ milestone })),
  }) as unknown as WorkSnapshot

describe('milestoneDeadlines', () => {
  it('junta itens da mesma milestone num prazo só, com a contagem', () => {
    const deadlines = milestoneDeadlines(snapshot({ authored: [sprint, sprint], issues: [sprint] }))
    expect(deadlines).toEqual([
      {
        id: sprint.url,
        title: 'Sprint 42',
        date: '2026-10-27',
        url: sprint.url,
        repository: 'acme/web',
        items: 3,
      },
    ])
  })

  it('ignora milestones sem data e itens sem milestone', () => {
    expect(milestoneDeadlines(snapshot({ authored: [noDate, null] }))).toEqual([])
  })

  it('ordena pelo prazo mais próximo', () => {
    const deadlines = milestoneDeadlines(snapshot({ authored: [release], issues: [sprint] }))
    expect(deadlines.map((d) => d.title)).toEqual(['Sprint 42', 'v2'])
  })
})

describe('repositoryOfMilestone', () => {
  it('tira o repositório da URL', () => {
    expect(repositoryOfMilestone('https://github.com/umbrella/workers/milestone/3')).toBe(
      'umbrella/workers',
    )
  })
})
