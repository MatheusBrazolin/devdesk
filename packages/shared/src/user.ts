import { z } from 'zod'

/** O usuário como o front enxerga: nunca carrega token ou dado sensível. */
export const userSchema = z.object({
  id: z.uuid(),
  login: z.string().min(1),
  name: z.string().nullable(),
  avatarUrl: z.url().nullable(),
  isDemo: z.boolean(),
})

export type User = z.infer<typeof userSchema>

export const meResponseSchema = z.object({
  user: userSchema,
})

export type MeResponse = z.infer<typeof meResponseSchema>
