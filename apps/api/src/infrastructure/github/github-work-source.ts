import { z } from 'zod'
import type { Clock } from '../../application/ports/security.js'
import type { WorkSource } from '../../application/ports/work-source.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import type { CiStatus, Issue, PullRequest, WorkSnapshot } from '../../domain/work.js'
import { DASHBOARD_QUERY, dashboardVariables } from './dashboard-query.js'
import { createReadOnlyFetch } from './read-only-fetch.js'

const DAY_MS = 24 * 60 * 60 * 1000

const actorSchema = z.object({ login: z.string(), avatarUrl: z.string().nullable() }).nullable()

const pullRequestNodeSchema = z.object({
  __typename: z.literal('PullRequest'),
  id: z.string(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
  isDraft: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  mergedAt: z.string().nullable(),
  reviewDecision: z.enum(['APPROVED', 'CHANGES_REQUESTED', 'REVIEW_REQUIRED']).nullable(),
  mergeable: z.enum(['MERGEABLE', 'CONFLICTING', 'UNKNOWN']),
  repository: z.object({ nameWithOwner: z.string() }),
  author: actorSchema,
  comments: z.object({ totalCount: z.number() }),
  latestOpinionatedReviews: z
    .object({ nodes: z.array(z.object({ state: z.string() }).nullable()) })
    .nullable(),
  commits: z.object({
    nodes: z.array(
      z
        .object({
          commit: z.object({
            statusCheckRollup: z.object({ state: z.string() }).nullable(),
          }),
        })
        .nullable(),
    ),
  }),
})

const issueNodeSchema = z.object({
  __typename: z.literal('Issue'),
  id: z.string(),
  number: z.number(),
  title: z.string(),
  url: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  repository: z.object({ nameWithOwner: z.string() }),
  author: actorSchema,
  comments: z.object({ totalCount: z.number() }),
  labels: z
    .object({ nodes: z.array(z.object({ name: z.string(), color: z.string() }).nullable()) })
    .nullable(),
})

/** Nós que não batem com o esperado (ex.: repositório bloqueado por SAML) são descartados. */
const searchSchema = z.object({
  issueCount: z.number(),
  nodes: z.array(z.unknown()),
})

const responseSchema = z.object({
  data: z
    .object({
      reviewRequested: searchSchema,
      authored: searchSchema,
      merged: searchSchema,
      issues: searchSchema,
    })
    .nullable()
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

function toCiStatus(state: string | undefined): CiStatus {
  switch (state) {
    case 'SUCCESS':
      return 'success'
    case 'FAILURE':
    case 'ERROR':
      return 'failure'
    case 'PENDING':
    case 'EXPECTED':
      return 'pending'
    default:
      return null
  }
}

function toPullRequest(node: z.infer<typeof pullRequestNodeSchema>): PullRequest {
  const reviews = node.latestOpinionatedReviews?.nodes ?? []
  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    repository: node.repository.nameWithOwner,
    author: node.author,
    isDraft: node.isDraft,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    mergedAt: node.mergedAt ? new Date(node.mergedAt) : null,
    ciStatus: toCiStatus(node.commits.nodes[0]?.commit.statusCheckRollup?.state),
    reviewDecision: node.reviewDecision
      ? (node.reviewDecision.toLowerCase() as PullRequest['reviewDecision'])
      : null,
    mergeable: node.mergeable.toLowerCase() as PullRequest['mergeable'],
    approvals: reviews.filter((review) => review?.state === 'APPROVED').length,
    comments: node.comments.totalCount,
  }
}

function toIssue(node: z.infer<typeof issueNodeSchema>): Issue {
  return {
    id: node.id,
    number: node.number,
    title: node.title,
    url: node.url,
    repository: node.repository.nameWithOwner,
    author: node.author,
    createdAt: new Date(node.createdAt),
    updatedAt: new Date(node.updatedAt),
    labels: (node.labels?.nodes ?? []).filter((label) => label !== null),
    comments: node.comments.totalCount,
  }
}

function parseNodes<S extends z.ZodType, T>(
  nodes: unknown[],
  schema: S,
  map: (n: z.infer<S>) => T,
): T[] {
  return nodes.flatMap((node) => {
    const parsed = schema.safeParse(node)
    return parsed.success ? [map(parsed.data)] : []
  })
}

export class GitHubWorkSource implements WorkSource {
  constructor(
    private readonly clock: Clock,
    private readonly fetchImpl: typeof fetch = createReadOnlyFetch(),
  ) {}

  async fetchSnapshot(accessToken: string): Promise<WorkSnapshot> {
    const now = this.clock.now()
    const response = await this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'user-agent': 'devdesk',
      },
      body: JSON.stringify({
        query: DASHBOARD_QUERY,
        variables: dashboardVariables(new Date(now.getTime() - 7 * DAY_MS)),
      }),
    })

    if (response.status === 401) throw githubReconnect()
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao montar o painel.`)

    const body = responseSchema.parse(await response.json())
    if (!body.data) {
      throw upstream(`GitHub recusou a consulta: ${body.errors?.[0]?.message ?? 'sem detalhes'}`)
    }

    const { reviewRequested, authored, merged, issues } = body.data
    return {
      fetchedAt: now,
      isSample: false,
      reviewRequested: parseNodes(reviewRequested.nodes, pullRequestNodeSchema, toPullRequest),
      authored: parseNodes(authored.nodes, pullRequestNodeSchema, toPullRequest),
      merged: parseNodes(merged.nodes, pullRequestNodeSchema, toPullRequest),
      issues: parseNodes(issues.nodes, issueNodeSchema, toIssue),
      totals: {
        reviewRequested: reviewRequested.issueCount,
        authored: authored.issueCount,
        merged: merged.issueCount,
        issues: issues.issueCount,
      },
    }
  }
}
