import { z } from 'zod'
import type { ActivitySource } from '../../application/ports/activity-source.js'
import type { Activity, ReviewVerdict, WorkRef } from '../../domain/activity.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import {
  ACTIVITY_QUERIES,
  type ActivityList,
  activitySearches,
  REVIEW_CONTRIBUTIONS_QUERY,
} from './activity-query.js'
import { createReadOnlyFetch } from './read-only-fetch.js'
import { readGitHubJson } from './read-github-json.js'

const refSchema = z.object({
  title: z.string(),
  url: z.string(),
  number: z.number(),
  repository: z.object({ nameWithOwner: z.string() }),
})

const reviewedSchema = refSchema.extend({
  reviews: z.object({
    nodes: z.array(z.object({ state: z.string(), submittedAt: z.string().nullable() }).nullable()),
  }),
})

const responseSchema = z.object({
  data: z
    .object({ search: z.object({ nodes: z.array(z.unknown()) }) })
    .nullable()
    .optional(),
  errors: z.array(z.object({ message: z.string() })).optional(),
})

const contributionsSchema = z.object({
  data: z.object({
    viewer: z.object({
      contributionsCollection: z.object({
        pullRequestReviewContributions: z.object({
          nodes: z.array(
            z
              .object({
                occurredAt: z.string(),
                pullRequestReview: z.object({ state: z.string() }),
                pullRequest: refSchema,
              })
              .nullable(),
          ),
        }),
      }),
    }),
  }),
})

/** Uma review enviada: em que PR, quando e com que resposta. */
interface SubmittedReview {
  ref: WorkRef
  at: number
  verdict: ReviewVerdict
}

const toRef = (node: z.infer<typeof refSchema>): WorkRef => ({
  title: node.title,
  url: node.url,
  number: node.number,
  repository: node.repository.nameWithOwner,
})

const VERDICTS: Record<string, ReviewVerdict> = {
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes_requested',
  COMMENTED: 'commented',
}

function parse<S extends z.ZodType>(nodes: unknown[], schema: S): z.infer<S>[] {
  return nodes.flatMap((node) => {
    const parsed = schema.safeParse(node)
    return parsed.success ? [parsed.data] : []
  })
}

export class GitHubActivitySource implements ActivitySource {
  constructor(private readonly fetchImpl: typeof fetch = createReadOnlyFetch()) {}

  async fetchActivity(accessToken: string, login: string, from: Date, to: Date): Promise<Activity> {
    const searches = activitySearches(from, to)
    const [[merged, opened, reviewed, closedIssues], contributed] = await Promise.all([
      Promise.all(
        (['merged', 'opened', 'reviewed', 'closedIssues'] as const).map((list) =>
          this.search(accessToken, list, {
            q: searches[list],
            ...(list === 'reviewed' && { login }),
          }),
        ),
      ),
      // Complemento: se o GitHub recusar, o standup segue só com a busca.
      this.reviewContributions(accessToken, from, to).catch(() => []),
    ])
    const inPeriod = (at: number) => at >= from.getTime() && at < to.getTime()

    const fromSearch = parse(reviewed!, reviewedSchema).flatMap((node): SubmittedReview[] =>
      node.reviews.nodes.flatMap((review) =>
        review?.submittedAt && VERDICTS[review.state] && inPeriod(Date.parse(review.submittedAt))
          ? [
              {
                ref: toRef(node),
                at: Date.parse(review.submittedAt),
                verdict: VERDICTS[review.state]!,
              },
            ]
          : [],
      ),
    )

    return {
      merged: parse(merged!, refSchema).map(toRef),
      opened: parse(opened!, refSchema).map(toRef),
      reviewed: latestPerPullRequest([
        ...fromSearch,
        ...contributed.filter((review) => inPeriod(review.at)),
      ]),
      closedIssues: parse(closedIssues!, refSchema).map(toRef),
    }
  }

  private async reviewContributions(
    accessToken: string,
    from: Date,
    to: Date,
  ): Promise<SubmittedReview[]> {
    const response = await this.post(accessToken, REVIEW_CONTRIBUTIONS_QUERY, {
      from: from.toISOString(),
      to: to.toISOString(),
    })
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} às contribuições.`)
    const body = await readGitHubJson(response, contributionsSchema, 'ler as reviews')
    return body.data.viewer.contributionsCollection.pullRequestReviewContributions.nodes.flatMap(
      (node) =>
        node && VERDICTS[node.pullRequestReview.state]
          ? [
              {
                ref: toRef(node.pullRequest),
                at: Date.parse(node.occurredAt),
                verdict: VERDICTS[node.pullRequestReview.state]!,
              },
            ]
          : [],
    )
  }

  private post(accessToken: string, query: string, variables: Record<string, string>) {
    return this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'user-agent': 'devdesk',
      },
      body: JSON.stringify({ query, variables }),
    })
  }

  private async search(accessToken: string, list: ActivityList, variables: Record<string, string>) {
    const response = await this.post(accessToken, ACTIVITY_QUERIES[list], variables)
    if (response.status === 401) throw githubReconnect()
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao montar o standup.`)

    const body = await readGitHubJson(response, responseSchema, 'montar o standup')
    if (!body.data)
      throw upstream(`GitHub recusou a consulta: ${body.errors?.[0]?.message ?? 'sem detalhes'}`)
    return body.data.search.nodes
  }
}

/**
 * Um item por PR, na ordem em que aparece, com a review mais recente: é ela
 * que diz o que a pessoa respondeu. As duas fontes trazem a mesma review às
 * vezes; juntar pelo endereço do PR tira a repetição.
 */
function latestPerPullRequest(
  reviews: SubmittedReview[],
): (WorkRef & { verdict: ReviewVerdict })[] {
  const latest = new Map<string, SubmittedReview>()
  for (const review of reviews) {
    const current = latest.get(review.ref.url)
    if (!current || review.at > current.at) latest.set(review.ref.url, review)
  }
  return [...latest.values()].map(({ ref, verdict }) => ({ ...ref, verdict }))
}
