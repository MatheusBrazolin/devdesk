import { z } from 'zod'

export const repositoryRefSchema = z.string().min(1) // "owner/nome"

export const actorSchema = z.object({
  login: z.string(),
  avatarUrl: z.url().nullable(),
})

export const milestoneSchema = z.object({
  title: z.string(),
  /** Data do prazo, sem fuso ("2026-10-31"); nula quando a milestone não tem data. */
  dueOn: z.iso.date().nullable(),
  url: z.url(),
})

export const ciStatusSchema = z.enum(['success', 'failure', 'pending']).nullable()
export const reviewDecisionSchema = z
  .enum(['approved', 'changes_requested', 'review_required'])
  .nullable()
export const mergeableSchema = z.enum(['mergeable', 'conflicting', 'unknown'])

/** Por que um item está na lista "Precisa da sua atenção", em ordem de urgência. */
export const attentionReasonSchema = z.enum([
  'review_requested',
  'changes_requested',
  'ci_failed',
  'conflict',
  'ready_to_merge',
])

export const pullRequestSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.url(),
  repository: repositoryRefSchema,
  author: actorSchema.nullable(),
  isDraft: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  mergedAt: z.iso.datetime().nullable(),
  ciStatus: ciStatusSchema,
  reviewDecision: reviewDecisionSchema,
  mergeable: mergeableSchema,
  approvals: z.number().int().nonnegative(),
  changesRequested: z.number().int().nonnegative(),
  comments: z.number().int().nonnegative(),
  milestone: milestoneSchema.nullable(),
  size: z
    .object({
      additions: z.number().int().nonnegative(),
      deletions: z.number().int().nonnegative(),
      changedFiles: z.number().int().nonnegative(),
    })
    .nullable(),
  /** Quando a review foi pedida pela última vez. */
  reviewRequestedAt: z.iso.datetime().nullable(),
  /** Quem ainda tem review pendente. */
  pendingReviewers: z.array(z.string()),
})

export const issueSchema = z.object({
  id: z.string(),
  number: z.number().int(),
  title: z.string(),
  url: z.url(),
  repository: repositoryRefSchema,
  author: actorSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  labels: z.array(z.object({ name: z.string(), color: z.string() })),
  comments: z.number().int().nonnegative(),
  milestone: milestoneSchema.nullable(),
})

export const attentionItemSchema = z.object({
  reason: attentionReasonSchema,
  pullRequest: pullRequestSchema,
})

export const dashboardSchema = z.object({
  /** Momento em que os dados foram lidos do GitHub (não da resposta). */
  fetchedAt: z.iso.datetime(),
  /** Dados de exemplo do modo demonstração, nunca de uma conta real. */
  isSample: z.boolean(),
  /** Retrato guardado; um mais novo está sendo buscado. Vale perguntar de novo em instantes. */
  stale: z.boolean(),
  summary: z.object({
    reviewRequested: z.number().int(),
    openPullRequests: z.number().int(),
    assignedIssues: z.number().int(),
    mergedThisWeek: z.number().int(),
  }),
  attention: z.array(attentionItemSchema),
  pullRequests: z.object({
    reviewRequested: z.array(pullRequestSchema),
    authored: z.array(pullRequestSchema),
    merged: z.array(pullRequestSchema),
  }),
  issues: z.array(issueSchema),
})

export type Actor = z.infer<typeof actorSchema>
export type Milestone = z.infer<typeof milestoneSchema>
export type CiStatus = z.infer<typeof ciStatusSchema>
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>
export type Mergeable = z.infer<typeof mergeableSchema>
export type AttentionReason = z.infer<typeof attentionReasonSchema>
export type PullRequest = z.infer<typeof pullRequestSchema>
export type Issue = z.infer<typeof issueSchema>
export type AttentionItem = z.infer<typeof attentionItemSchema>
export type Dashboard = z.infer<typeof dashboardSchema>
