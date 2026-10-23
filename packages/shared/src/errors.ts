import { z } from 'zod'

export const apiErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  /** A sessão vale, mas o GitHub recusou o token (revogado ou expirado). */
  'GITHUB_RECONNECT',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION',
  'RATE_LIMITED',
  'UPSTREAM',
  'INTERNAL',
])

export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>

/** Formato único de erro em toda a API, para o front tratar num lugar só. */
export const apiErrorSchema = z.object({
  error: z.object({
    code: apiErrorCodeSchema,
    message: z.string(),
  }),
})

export type ApiError = z.infer<typeof apiErrorSchema>
