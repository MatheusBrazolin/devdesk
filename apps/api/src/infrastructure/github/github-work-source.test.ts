import { describe, expect, it } from 'vitest'
import { FakeClock } from '../../../test/helpers.js'
import { GitHubWorkSource } from './github-work-source.js'

const prNode = (overrides: Record<string, unknown> = {}) => ({
  __typename: 'PullRequest',
  id: 'PR_kwDO1',
  number: 42,
  title: 'Adiciona cache',
  url: 'https://github.com/acme/app/pull/42',
  isDraft: false,
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-22T10:00:00Z',
  mergedAt: null,
  reviewDecision: 'APPROVED',
  mergeable: 'MERGEABLE',
  repository: { nameWithOwner: 'acme/app' },
  author: { login: 'octocat', avatarUrl: 'https://avatars.githubusercontent.com/u/1' },
  comments: { totalCount: 3 },
  latestOpinionatedReviews: {
    nodes: [{ state: 'APPROVED' }, { state: 'CHANGES_REQUESTED' }, { state: 'APPROVED' }],
  },
  commits: { nodes: [{ commit: { statusCheckRollup: { state: 'FAILURE' } } }] },
  ...overrides,
})

const issueNode = {
  __typename: 'Issue',
  id: 'I_kwDO1',
  number: 7,
  title: 'Bug no login',
  url: 'https://github.com/acme/app/issues/7',
  createdAt: '2026-10-20T10:00:00Z',
  updatedAt: '2026-10-21T10:00:00Z',
  repository: { nameWithOwner: 'acme/app' },
  author: null,
  comments: { totalCount: 0 },
  labels: { nodes: [{ name: 'bug', color: 'd73a4a' }] },
}

const search = (nodes: unknown[], issueCount = nodes.length) => ({ issueCount, nodes })

function fakeFetch(status: number, body: unknown) {
  const requests: { url: string; init: RequestInit }[] = []
  const impl = (async (url: string, init: RequestInit) => {
    requests.push({ url, init })
    return new Response(JSON.stringify(body), { status })
  }) as unknown as typeof fetch
  return { impl, requests }
}

const clock = new FakeClock(new Date('2026-10-23T12:00:00Z'))

describe('GitHubWorkSource', () => {
  it('traduz a resposta do GraphQL para o domínio', async () => {
    const { impl } = fakeFetch(200, {
      data: {
        reviewRequested: search([]),
        authored: search([prNode()], 45),
        merged: search([]),
        issues: search([issueNode]),
      },
    })

    const snapshot = await new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')

    expect(snapshot.authored[0]).toMatchObject({
      repository: 'acme/app',
      reviewDecision: 'approved',
      mergeable: 'mergeable',
      ciStatus: 'failure',
      approvals: 2,
      comments: 3,
    })
    expect(snapshot.authored[0]?.updatedAt).toEqual(new Date('2026-10-22T10:00:00Z'))
    expect(snapshot.issues[0]?.labels).toEqual([{ name: 'bug', color: 'd73a4a' }])
    expect(snapshot.totals.authored).toBe(45)
    expect(snapshot.isSample).toBe(false)
  })

  it.each([
    ['SUCCESS', 'success'],
    ['ERROR', 'failure'],
    ['PENDING', 'pending'],
    ['EXPECTED', 'pending'],
  ])('status de CI %s vira %s', async (state, expected) => {
    const node = prNode({ commits: { nodes: [{ commit: { statusCheckRollup: { state } } }] } })
    const { impl } = fakeFetch(200, {
      data: {
        reviewRequested: search([node]),
        authored: search([]),
        merged: search([]),
        issues: search([]),
      },
    })
    const snapshot = await new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')
    expect(snapshot.reviewRequested[0]?.ciStatus).toBe(expected)
  })

  it('lê o prazo da milestone como data', async () => {
    const node = prNode({
      milestone: {
        title: 'Sprint 42',
        dueOn: '2026-10-31T00:00:00Z',
        url: 'https://github.com/acme/app/milestone/42',
      },
    })
    const { impl } = fakeFetch(200, {
      data: {
        reviewRequested: search([]),
        authored: search([node]),
        merged: search([]),
        issues: search([]),
      },
    })
    const snapshot = await new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')
    expect(snapshot.authored[0]?.milestone).toEqual({
      title: 'Sprint 42',
      dueOn: '2026-10-31',
      url: 'https://github.com/acme/app/milestone/42',
    })
  })

  it('PR sem CI configurado fica com status nulo', async () => {
    const node = prNode({ commits: { nodes: [{ commit: { statusCheckRollup: null } }] } })
    const { impl } = fakeFetch(200, {
      data: {
        reviewRequested: search([node]),
        authored: search([]),
        merged: search([]),
        issues: search([]),
      },
    })
    const snapshot = await new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')
    expect(snapshot.reviewRequested[0]?.ciStatus).toBeNull()
  })

  it('descarta nós nulos ou incompletos (ex.: org com SAML) sem perder o resto', async () => {
    const { impl } = fakeFetch(200, {
      data: {
        reviewRequested: search([null, {}, prNode()]),
        authored: search([]),
        merged: search([]),
        issues: search([]),
      },
      errors: [{ message: 'Resource protected by organization SAML enforcement.' }],
    })
    const snapshot = await new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')
    expect(snapshot.reviewRequested).toHaveLength(1)
  })

  it('manda o token e busca os mergeados dos últimos 7 dias', async () => {
    const { impl, requests } = fakeFetch(200, {
      data: {
        reviewRequested: search([]),
        authored: search([]),
        merged: search([]),
        issues: search([]),
      },
    })
    await new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')

    const [request] = requests
    expect(request?.url).toBe('https://api.github.com/graphql')
    expect(new Headers(request?.init.headers).get('authorization')).toBe('Bearer gho_x')
    const body = JSON.parse(String(request?.init.body))
    expect(body.variables.mergedQuery).toBe('is:pr is:merged author:@me merged:>=2026-10-16')
    expect(body.variables.reviewQuery).toContain('review-requested:@me')
  })

  it('token recusado pede reconexão', async () => {
    const { impl } = fakeFetch(401, { message: 'Bad credentials' })
    await expect(new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')).rejects.toMatchObject({
      code: 'GITHUB_RECONNECT',
    })
  })

  it('erro sem dados vira falha de upstream', async () => {
    const { impl } = fakeFetch(200, { data: null, errors: [{ message: 'Something went wrong' }] })
    await expect(new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')).rejects.toMatchObject({
      code: 'UPSTREAM',
    })
  })

  it('GitHub fora do ar vira falha de upstream', async () => {
    const { impl } = fakeFetch(502, {})
    await expect(new GitHubWorkSource(clock, impl).fetchSnapshot('gho_x')).rejects.toMatchObject({
      code: 'UPSTREAM',
    })
  })
})
