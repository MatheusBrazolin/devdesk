import { z } from 'zod'

/** Token pessoal do GitHub colado pela própria pessoa (classic ou fine-grained). */
export const connectGitHubTokenInputSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^(ghp_|github_pat_)[A-Za-z0-9_]+$/, 'cole um token que comece com ghp_ ou github_pat_')
    .max(255),
})

export const gitHubTokenStatusSchema = z.object({
  /** Com token pessoal, os dados vêm dele; sem, do login pelo OAuth. */
  connected: z.boolean(),
  savedAt: z.iso.datetime().nullable(),
})

export type ConnectGitHubTokenInput = z.infer<typeof connectGitHubTokenInputSchema>
export type GitHubTokenStatus = z.infer<typeof gitHubTokenStatusSchema>
