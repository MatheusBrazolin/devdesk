import { z } from 'zod'
import type { ActivitySource } from '../../application/ports/activity-source.js'
import type { Activity, ReviewVerdict, WorkRef } from '../../domain/activity.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import { ACTIVITY_QUERIES, type ActivityList, activitySearches } from './activity-query.js'
import { createReadOnlyFetch } from './read-only-fetch.js'

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
    const [merged, opened, reviewed, closedIssues] = await Promise.all(
      (['merged', 'opened', 'reviewed', 'closedIssues'] as const).map((list) =>
        this.search(accessToken, list, {
          q: searches[list],
          ...(list === 'reviewed' && { login }),
        }),
      ),
    )

    return {
      merged: parse(merged!, refSchema).map(toRef),
      opened: parse(opened!, refSchema).map(toRef),
      reviewed: parse(reviewed!, reviewedSchema).flatMap((node) => {
        // A review mais recente dentro do período diz o que a pessoa respondeu.
        const inPeriod = node.reviews.nodes
          .filter((review) => review?.submittedAt && VERDICTS[review.state])
          .filter((review) => {
            const at = Date.parse(review!.submittedAt!)
            return at >= from.getTime() && at < to.getTime()
          })
        const last = inPeriod.at(-1)
        return last ? [{ ...toRef(node), verdict: VERDICTS[last.state]! }] : []
      }),
      closedIssues: parse(closedIssues!, refSchema).map(toRef),
    }
  }

  private async search(accessToken: string, list: ActivityList, variables: Record<string, string>) {
    const response = await this.fetchImpl('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'user-agent': 'devdesk',
      },
      body: JSON.stringify({ query: ACTIVITY_QUERIES[list], variables }),
    })
    if (response.status === 401) throw githubReconnect()
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao montar o standup.`)

    const body = responseSchema.parse(await response.json())
    if (!body.data)
      throw upstream(`GitHub recusou a consulta: ${body.errors?.[0]?.message ?? 'sem detalhes'}`)
    return body.data.search.nodes
  }
}
