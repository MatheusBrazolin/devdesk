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

export const tokenSourceSchema = z.enum(['personal', 'server', 'oauth'])

/** Saúde do acesso ao GitHub, para as Configurações e o aviso de vencimento. */
export const gitHubHealthSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    source: tokenSourceSchema,
    /** Só tokens pessoais com validade informam quando vencem. */
    expiresAt: z.iso.datetime().nullable(),
    organizations: z.array(z.object({ login: z.string(), avatarUrl: z.string().nullable() })),
    rateLimit: z
      .object({ remaining: z.number(), limit: z.number(), resetAt: z.iso.datetime() })
      .nullable(),
  }),
  /** O GitHub recusou o token: venceu ou foi revogado. */
  z.object({ ok: z.literal(false), source: tokenSourceSchema }),
])

export type TokenSource = z.infer<typeof tokenSourceSchema>
export type GitHubHealth = z.infer<typeof gitHubHealthSchema>
