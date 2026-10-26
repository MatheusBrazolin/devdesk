import { z } from 'zod'

export const teamPullRequestSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.url(),
  repository: z.string(),
  author: z.object({ login: z.string(), avatarUrl: z.string().nullable() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** Reviews de outras pessoas. */
  reviews: z.number().int().nonnegative(),
  /** Quem ainda tem review pedida; "você" quando é a própria pessoa. */
  pendingReviewers: z.array(z.string()),
  lines: z.number().int().nonnegative().nullable(),
  waitingHours: z.number().nonnegative(),
})

export const teamSchema = z.object({
  isSample: z.boolean(),
  fetchedAt: z.iso.datetime(),
  repositories: z.array(z.string()),
  totals: z.object({
    open: z.number().int().nonnegative(),
    withoutReview: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
    medianHoursWaiting: z.number().nonnegative().nullable(),
  }),
  queue: z.array(teamPullRequestSchema),
  reviewLoad: z.array(z.object({ reviewer: z.string(), pending: z.number().int().positive() })),
})

export type TeamPullRequest = z.infer<typeof teamPullRequestSchema>
export type Team = z.infer<typeof teamSchema>
