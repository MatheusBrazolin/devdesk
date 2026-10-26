import { z } from 'zod'
import type { TeamSource } from '../../application/ports/team-source.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import type { TeamPullRequest } from '../../domain/team.js'
import { createReadOnlyFetch } from './read-only-fetch.js'
import { readGitHubJson } from './read-github-json.js'

const TEAM_QUERY = /* GraphQL */ `
  query TeamOpen($q: String!) {
    search(type: ISSUE, query: $q, first: 50) {
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          isDraft
          createdAt
          updatedAt
          reviewDecision
          additions
          deletions
          repository {
            nameWithOwner
          }
          author {
            login
            avatarUrl
          }
          reviewRequests(first: 10) {
            nodes {
              requestedReviewer {
                __typename
                ... on User {
                  login
                }
                ... on Team {
                  name
                }
              }
            }
          }
          reviews(first: 20) {
            nodes {
              author {
                login
              }
            }
          }
        }
      }
    }
  }
`

const nodeSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
  isDraft: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewDecision: z.string().nullable(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  repository: z.object({ nameWithOwner: z.string() }),
  author: z.object({ login: z.string(), avatarUrl: z.string().nullable().optional() }).nullable(),
  reviewRequests: z
    .object({
      nodes: z.array(
        z
          .object({
            requestedReviewer: z
              .object({ login: z.string().optional(), name: z.string().optional() })
              .nullable(),
          })
          .nullable(),
      ),
    })
    .nullable()
    .optional(),
  reviews: z
    .object({
      nodes: z.array(z.object({ author: z.object({ login: z.string() }).nullable() }).nullable()),
    })
    .nullable()
    .optional(),
})

const responseSchema = z.object({
  data: z.object({ search: z.object({ nodes: z.array(z.unknown()) }) }),
})

/** A busca do GitHub aceita até 256 caracteres: entram os repositórios que couberem. */
const MAX_QUERY = 256
const BASE_QUERY = 'is:pr is:open archived:false sort:created-asc'

export function teamSearchQuery(repositories: string[]): { q: string; used: string[] } {
  let q = BASE_QUERY
  const used: string[] = []
  for (const repository of repositories) {
    const next = `${q} repo:${repository}`
    if (next.length > MAX_QUERY) break
    q = next
    used.push(repository)
  }
  return { q, used }
}

export class GitHubTeamSource implements TeamSource {
  constructor(private readonly fetchImpl: typeof fetch = createReadOnlyFetch()) {}

  async fetchOpenPullRequests(accessToken: string, login: string, repositories: string[]) {
    const { q, used } = teamSearchQuery(repositories)
    if (used.length === 0) return { pullRequests: [], repositories: [] }

    const response = await this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'user-agent': 'devdesk',
      },
      body: JSON.stringify({ query: TEAM_QUERY, variables: { q } }),
    })
    if (response.status === 401) throw githubReconnect()
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao montar o time.`)
    const parsed = responseSchema.safeParse(
      await readGitHubJson(response, z.unknown(), 'montar o time'),
    )
    if (!parsed.success) throw upstream('O GitHub respondeu num formato inesperado (time).')

    // Cada PR à parte: o que não bater (ex.: bloqueado por SAML) sai do painel.
    const pullRequests = parsed.data.data.search.nodes.flatMap((raw): TeamPullRequest[] => {
      const result = nodeSchema.safeParse(raw)
      if (!result.success) return []
      const node = result.data
      const author = node.author?.login ?? 'ghost'
      return [
        {
          id: node.id,
          number: node.number,
          title: node.title,
          url: node.url,
          repository: node.repository.nameWithOwner,
          author: { login: author, avatarUrl: node.author?.avatarUrl ?? null },
          isDraft: node.isDraft,
          createdAt: new Date(node.createdAt),
          updatedAt: new Date(node.updatedAt),
          approved: node.reviewDecision === 'APPROVED',
          reviews: (node.reviews?.nodes ?? []).filter(
            (review) => review?.author && review.author.login !== author,
          ).length,
          pendingReviewers: (node.reviewRequests?.nodes ?? []).flatMap((request) => {
            const reviewer = request?.requestedReviewer
            const name = reviewer?.login ?? reviewer?.name
            return name ? [name === login ? 'você' : name] : []
          }),
          lines:
            node.additions === undefined || node.deletions === undefined
              ? null
              : node.additions + node.deletions,
        },
      ]
    })
    return { pullRequests, repositories: used }
  }
}
