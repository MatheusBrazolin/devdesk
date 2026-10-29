import type { z } from 'zod'
import { githubUnexpected } from '../../domain/errors.js'

/**
 * Lê e valida uma resposta do GitHub. Formato inesperado é falha do GitHub
 * (502), nunca "sua requisição é inválida" (400): quem pediu não errou.
 */
export async function readGitHubJson<S extends z.ZodType>(
  response: Response,
  schema: S,
  what: string,
): Promise<z.infer<S>> {
  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    throw githubUnexpected(`resposta ilegível ao ${what}`, error)
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw githubUnexpected(`resposta inesperada ao ${what}`, parsed.error)
  return parsed.data
}
