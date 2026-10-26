import { describe, expect, it } from 'vitest'
import { GitHubTeamSource, teamSearchQuery } from './github-team-source.js'

describe('teamSearchQuery', () => {
  it('entra repositório até o limite de 256 caracteres da busca', () => {
    const repos = Array.from({ length: 20 }, (_, i) => `organizacao/repositorio-${i}`)
    const { q, used } = teamSearchQuery(repos)
    expect(q.length).toBeLessThanOrEqual(256)
    expect(used.length).toBeGreaterThan(3)
    expect(used.length).toBeLessThan(20)
    expect(q).toContain(`repo:${used.at(-1)}`)
  })
})

describe('GitHubTeamSource', () => {
  it('lê os PRs, conta reviews de outras pessoas e chama você de você', async () => {
    const body = {
      data: {
        search: {
          nodes: [
            {
              id: 'PR_1',
              number: 7,
              title: 'Cache do catálogo',
              url: 'https://github.com/acme/web/pull/7',
              isDraft: false,
              createdAt: '2026-10-20T12:00:00Z',
              updatedAt: '2026-10-25T12:00:00Z',
              reviewDecision: 'REVIEW_REQUIRED',
              additions: 40,
              deletions: 2,
              repository: { nameWithOwner: 'acme/web' },
              author: { login: 'ana', avatarUrl: null },
              reviewRequests: {
                nodes: [
                  { requestedReviewer: { __typename: 'User', login: 'eu' } },
                  { requestedReviewer: { __typename: 'Team', name: 'time-web' } },
                ],
              },
              reviews: { nodes: [{ author: { login: 'ana' } }, { author: { login: 'bia' } }] },
            },
            {},
          ],
        },
      },
    }
    const calls: string[] = []
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      calls.push(String(init.body))
      return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })
    }) as unknown as typeof fetch

    const result = await new GitHubTeamSource(fetchImpl).fetchOpenPullRequests('t', 'eu', [
      'acme/web',
    ])
    expect(calls[0]).toContain('repo:acme/web')
    expect(result.repositories).toEqual(['acme/web'])
    expect(result.pullRequests).toEqual([
      expect.objectContaining({
        number: 7,
        reviews: 1,
        lines: 42,
        approved: false,
        pendingReviewers: ['você', 'time-web'],
      }),
    ])
  })

  it('sem repositórios, nem chama o GitHub', async () => {
    const fetchImpl = (() => {
      throw new Error('não devia chamar')
    }) as unknown as typeof fetch
    await expect(
      new GitHubTeamSource(fetchImpl).fetchOpenPullRequests('t', 'eu', []),
    ).resolves.toEqual({ pullRequests: [], repositories: [] })
  })
})
