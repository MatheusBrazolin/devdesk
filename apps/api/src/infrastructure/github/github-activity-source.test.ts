import { describe, expect, it } from 'vitest'
import { ACTIVITY_QUERIES } from './activity-query.js'
import { GitHubActivitySource } from './github-activity-source.js'
import { assertReadOnly } from './read-only-fetch.js'

const from = new Date('2026-10-22T03:00:00Z')
const to = new Date('2026-10-23T03:00:00Z')

const node = (n: number, extra: object = {}) => ({
  __typename: 'PullRequest',
  title: `PR ${n}`,
  url: `https://github.com/a/b/pull/${n}`,
  number: n,
  repository: { nameWithOwner: 'a/b' },
  ...extra,
})

function fakeGitHub(nodesFor: (q: string) => unknown[]) {
  const requests: { q: string; login?: string }[] = []
  const impl = (async (_url: string, init: RequestInit) => {
    const { variables } = JSON.parse(String(init.body))
    requests.push(variables)
    return new Response(JSON.stringify({ data: { search: { nodes: nodesFor(variables.q) } } }))
  }) as unknown as typeof fetch
  return { impl, requests }
}

describe('GitHubActivitySource', () => {
  it('busca o período com instantes, sem milissegundos', async () => {
    const { impl, requests } = fakeGitHub(() => [])
    await new GitHubActivitySource(impl).fetchActivity('t', 'eu', from, to)
    expect(requests.map((r) => r.q)).toEqual([
      'is:pr author:@me merged:2026-10-22T03:00:00Z..2026-10-23T03:00:00Z',
      'is:pr author:@me created:2026-10-22T03:00:00Z..2026-10-23T03:00:00Z',
      'is:pr reviewed-by:@me -author:@me updated:>=2026-10-22T03:00:00Z',
      'is:issue assignee:@me closed:2026-10-22T03:00:00Z..2026-10-23T03:00:00Z',
    ])
    expect(requests[2]?.login).toBe('eu')
  })

  it('conta só reviews enviadas dentro do período, com a resposta mais recente', async () => {
    const { impl } = fakeGitHub((q) =>
      q.includes('reviewed-by')
        ? [
            node(1, {
              reviews: {
                nodes: [
                  { state: 'COMMENTED', submittedAt: '2026-10-22T13:00:00Z' },
                  { state: 'APPROVED', submittedAt: '2026-10-22T18:00:00Z' },
                ],
              },
            }),
            node(2, {
              reviews: { nodes: [{ state: 'APPROVED', submittedAt: '2026-10-20T13:00:00Z' }] },
            }),
            node(3, { reviews: { nodes: [{ state: 'PENDING', submittedAt: null }] } }),
          ]
        : [],
    )
    const activity = await new GitHubActivitySource(impl).fetchActivity('t', 'eu', from, to)
    expect(activity.reviewed.map((r) => [r.number, r.verdict])).toEqual([[1, 'approved']])
  })

  it('token recusado pede reconexão', async () => {
    const impl = (async () => new Response('{}', { status: 401 })) as unknown as typeof fetch
    await expect(
      new GitHubActivitySource(impl).fetchActivity('t', 'eu', from, to),
    ).rejects.toMatchObject({
      code: 'GITHUB_RECONNECT',
    })
  })

  it.each(Object.entries(ACTIVITY_QUERIES))(
    'a consulta %s passa pela trava de só leitura',
    (_list, query) => {
      expect(() =>
        assertReadOnly('https://api.github.com/graphql', {
          method: 'POST',
          body: JSON.stringify({ query }),
        }),
      ).not.toThrow()
    },
  )
})
