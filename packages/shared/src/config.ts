import { z } from 'zod'

/** O que o front precisa saber da API antes do login. */
export const publicConfigSchema = z.object({
  githubLoginEnabled: z.boolean(),
  demoEnabled: z.boolean(),
  /** Modo pessoal: a instalação usa o token de uma pessoa só. */
  personalTokenEnabled: z.boolean(),
  /** Dono do token pessoal; nulo se desligado ou se o GitHub recusou o token. */
  personalLogin: z.string().nullable(),
})

export type PublicConfig = z.infer<typeof publicConfigSchema>
