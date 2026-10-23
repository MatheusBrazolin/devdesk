import type { Issue } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { groupByRepository } from './group-by-repository'

const issue = (repository: string, number: number): Issue => ({
  id: `${repository}#${number}`,
  number,
  title: 't',
  url: 'https://github.com/x/y/issues/1',
  repository,
  author: null,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-20T10:00:00Z',
  labels: [],
  comments: 0,
  milestone: null,
})

describe('groupByRepository', () => {
  it('agrupa e põe o repositório com mais issues primeiro', () => {
    const groups = groupByRepository([issue('b/app', 1), issue('a/api', 2), issue('b/app', 3)])
    expect(groups.map(([repo, items]) => [repo, items.length])).toEqual([
      ['b/app', 2],
      ['a/api', 1],
    ])
  })

  it('desempata pelo nome', () => {
    const groups = groupByRepository([issue('z/z', 1), issue('a/a', 2)])
    expect(groups.map(([repo]) => repo)).toEqual(['a/a', 'z/z'])
  })
})
