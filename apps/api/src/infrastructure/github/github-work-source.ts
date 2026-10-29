import { z } from 'zod'
import type { Clock } from '../../application/ports/security.js'
import type { WorkSource } from '../../application/ports/work-source.js'
import { githubReconnect, githubUnavailable, githubUnexpected } from '../../domain/errors.js'
import type { CiStatus, Issue, Milestone, PullRequest, WorkSnapshot } from '../../domain/work.js'
import { DASHBOARD_QUERIES, type DashboardList, dashboardSearches } from './dashboard-query.js'
import { createReadOnlyFetch } from './read-only-fetch.js'
import { readGitHubJson } from './read-github-json.js'

const DAY_MS = 24 * 60 * 60 * 1000

const actorSchema = z.object({ login: z.string(), avatarUrl: z.string().nullable() }).nullable()

const milestoneSchema = z
  .object({ title: z.string(), dueOn: z.string().nullable(), url: z.string() })
  .nullable()
  .optional()

/**
 * O GitHub guarda o prazo como data, mas devolve um instante. A parte da data
 * em UTC é o dia que aparece na interface do GitHub.
 */
function toMilestone(node: z.infer<typeof milestoneSchema>): Milestone | null {
  if (!node) return null
  return { title: node.title, dueOn: node.dueOn ? node.dueOn.slice(0, 10) : null, url: node.url }
}

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
    .nullable()
    .optional(),
  milestone: milestoneSchema,
  additions: z.number().optional(),
  deletions: z.number().optional(),
  changedFiles: z.number().optional(),
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
  timelineItems: z
    .object({ nodes: z.array(z.object({ createdAt: z.string().optional() }).nullable()) })
    .nullable()
    .optional(),
  commits: z
    .object({
      nodes: z.array(
        z
          .object({
            commit: z.object({
              statusCheckRollup: z.object({ state: z.string() }).nullable(),
            }),
          })
          .nullable(),
      ),
    })
    .optional(),
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
  milestone: milestoneSchema,
})

/** Nós que não batem com o esperado (ex.: repositório bloqueado por SAML) são descartados. */
const searchSchema = z.object({
  issueCount: z.number(),
  nodes: z.array(z.unknown()),
})

const responseSchema = z.object({
  data: z.object({ search: searchSchema }).nullable().optional(),
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
  const requestedAt = node.timelineItems?.nodes.at(-1)?.createdAt
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
    ciStatus: toCiStatus(node.commits?.nodes[0]?.commit.statusCheckRollup?.state),
    reviewDecision: node.reviewDecision
      ? (node.reviewDecision.toLowerCase() as PullRequest['reviewDecision'])
      : null,
    mergeable: node.mergeable.toLowerCase() as PullRequest['mergeable'],
    approvals: reviews.filter((review) => review?.state === 'APPROVED').length,
    changesRequested: reviews.filter((review) => review?.state === 'CHANGES_REQUESTED').length,
    comments: node.comments.totalCount,
    milestone: toMilestone(node.milestone),
    size:
      node.additions === undefined ||
      node.deletions === undefined ||
      node.changedFiles === undefined
        ? null
        : { additions: node.additions, deletions: node.deletions, changedFiles: node.changedFiles },
    reviewRequestedAt: requestedAt ? new Date(requestedAt) : null,
    pendingReviewers: (node.reviewRequests?.nodes ?? []).flatMap((request) => {
      const reviewer = request?.requestedReviewer
      const name = reviewer?.login ?? reviewer?.name
      return name ? [name] : []
    }),
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
    milestone: toMilestone(node.milestone),
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
    const searches = dashboardSearches(new Date(now.getTime() - 7 * DAY_MS))
    const lists = ['reviewRequested', 'authored', 'merged', 'issues'] as const
    const [reviewRequested, authored, merged, issues] = await Promise.all(
      lists.map((list) => this.search(accessToken, list, searches[list])),
    )

    return {
      fetchedAt: now,
      isSample: false,
      reviewRequested: parseNodes(reviewRequested!.nodes, pullRequestNodeSchema, toPullRequest),
      authored: parseNodes(authored!.nodes, pullRequestNodeSchema, toPullRequest),
      merged: parseNodes(merged!.nodes, pullRequestNodeSchema, toPullRequest),
      issues: parseNodes(issues!.nodes, issueNodeSchema, toIssue),
      totals: {
        reviewRequested: reviewRequested!.issueCount,
        authored: authored!.issueCount,
        merged: merged!.issueCount,
        issues: issues!.issueCount,
      },
    }
  }

  private async search(accessToken: string, list: DashboardList, q: string) {
    const response = await this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'user-agent': 'devdesk',
      },
      body: JSON.stringify({ query: DASHBOARD_QUERIES[list], variables: { q } }),
    })

    if (response.status === 401) throw githubReconnect()
    if (!response.ok)
      throw githubUnavailable(`GitHub respondeu ${response.status} ao montar o painel.`)

    const body = await readGitHubJson(response, responseSchema, 'montar o painel')
    if (!body.data) {
      throw githubUnexpected(
        `GitHub recusou a consulta: ${body.errors?.[0]?.message ?? 'sem detalhes'}`,
      )
    }
    return body.data.search
  }
}
