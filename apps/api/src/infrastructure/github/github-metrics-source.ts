import { z } from 'zod'
import type { MetricsSource } from '../../application/ports/metrics-source.js'
import type { MergedPullRequestFacts, MetricsData } from '../../domain/metrics.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import { REVIEW_CONTRIBUTIONS_QUERY } from './activity-query.js'
import { createReadOnlyFetch } from './read-only-fetch.js'
import { readGitHubJson } from './read-github-json.js'

/**
 * Duas leituras em paralelo: os PRs mergeados no período (com a primeira
 * review de outra pessoa e o tamanho) e as reviews que a pessoa fez, pelas
 * contribuições do perfil. Só leitura, como todo o resto.
 */
const MERGED_QUERY = /* GraphQL */ `
  query MetricsMerged($q: String!) {
    search(type: ISSUE, query: $q, first: 100) {
      nodes {
        ... on PullRequest {
          createdAt
          mergedAt
          additions
          deletions
          reviews(first: 10) {
            nodes {
              submittedAt
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

/** Cada PR é validado à parte: o que não bater (ex.: bloqueado por SAML) sai da conta. */
const mergedNodeSchema = z.object({
  createdAt: z.string(),
  mergedAt: z.string(),
  additions: z.number().optional(),
  deletions: z.number().optional(),
  reviews: z
    .object({
      nodes: z.array(
        z
          .object({
            submittedAt: z.string().nullable(),
            author: z.object({ login: z.string() }).nullable(),
          })
          .nullable(),
      ),
    })
    .nullable()
    .optional(),
})

const mergedSchema = z.object({
  data: z.object({ search: z.object({ nodes: z.array(z.unknown()) }) }),
})

const contributionsSchema = z.object({
  data: z.object({
    viewer: z.object({
      contributionsCollection: z.object({
        pullRequestReviewContributions: z.object({
          nodes: z.array(z.object({ occurredAt: z.string() }).nullable()),
        }),
      }),
    }),
  }),
})

const stamp = (date: Date) => date.toISOString().replace(/\.\d{3}Z$/, 'Z')

export class GitHubMetricsSource implements MetricsSource {
  constructor(private readonly fetchImpl: typeof fetch = createReadOnlyFetch()) {}

  async fetchMetrics(
    accessToken: string,
    login: string,
    from: Date,
    to: Date,
  ): Promise<MetricsData> {
    const [merged, reviewsGiven] = await Promise.all([
      this.merged(accessToken, login, from),
      this.reviews(accessToken, from, to),
    ])
    return { merged, reviewsGiven }
  }

  private async merged(
    token: string,
    login: string,
    from: Date,
  ): Promise<MergedPullRequestFacts[]> {
    const body = await this.post(token, MERGED_QUERY, {
      q: `is:pr author:@me is:merged merged:>=${stamp(from)} sort:updated-desc`,
    })
    const parsed = mergedSchema.safeParse(body)
    if (!parsed.success) throw upstream('O GitHub respondeu num formato inesperado (métricas).')
    return parsed.data.data.search.nodes.flatMap((raw): MergedPullRequestFacts[] => {
      const result = mergedNodeSchema.safeParse(raw)
      if (!result.success) return []
      const node = result.data
      const firstReview = (node.reviews?.nodes ?? [])
        .filter((review) => review?.submittedAt && review.author?.login !== login)
        .map((review) => new Date(review!.submittedAt!))
        .sort((a, b) => a.getTime() - b.getTime())[0]
      return [
        {
          createdAt: new Date(node.createdAt),
          mergedAt: new Date(node.mergedAt),
          firstReviewAt: firstReview ?? null,
          lines:
            node.additions === undefined || node.deletions === undefined
              ? null
              : node.additions + node.deletions,
        },
      ]
    })
  }

  private async reviews(token: string, from: Date, to: Date): Promise<Date[]> {
    const body = await this.post(token, REVIEW_CONTRIBUTIONS_QUERY, {
      from: from.toISOString(),
      to: to.toISOString(),
    })
    const parsed = contributionsSchema.safeParse(body)
    // As contribuições são complemento: sem elas, as métricas saem sem reviews.
    if (!parsed.success) return []
    return parsed.data.data.viewer.contributionsCollection.pullRequestReviewContributions.nodes.flatMap(
      (node) => (node ? [new Date(node.occurredAt)] : []),
    )
  }

  private async post(token: string, query: string, variables: Record<string, string>) {
    const response = await this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'user-agent': 'devdesk',
      },
      body: JSON.stringify({ query, variables }),
    })
    if (response.status === 401) throw githubReconnect()
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao montar as métricas.`)
    return readGitHubJson(response, z.unknown(), 'montar as métricas')
  }
}
