import { z } from 'zod'

/** O que o front precisa saber da API antes do login. */
export const publicConfigSchema = z.object({
  githubLoginEnabled: z.boolean(),
  demoEnabled: z.boolean(),
})

export type PublicConfig = z.infer<typeof publicConfigSchema>
