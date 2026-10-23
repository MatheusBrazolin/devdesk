import type { ApiError, ApiErrorCode } from '@devdesk/shared'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../../domain/errors.js'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  GITHUB_RECONNECT: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  RATE_LIMITED: 429,
  UPSTREAM: 502,
  INTERNAL: 500,
}

const body = (code: ApiErrorCode, message: string): ApiError => ({ error: { code, message } })

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      if (error.code === 'UPSTREAM') request.log.warn({ err: error }, error.message)
      return reply.status(STATUS_BY_CODE[error.code]).send(body(error.code, error.message))
    }

    if (error instanceof ZodError) {
      return reply.status(400).send(body('VALIDATION', 'Requisição inválida.'))
    }

    const status = (error as { statusCode?: number }).statusCode
    if (status === 429) {
      return reply.status(429).send(body('RATE_LIMITED', 'Muitas requisições. Tente em instantes.'))
    }
    if (status && status >= 400 && status < 500) {
      return reply.status(status).send(body('VALIDATION', (error as Error).message))
    }

    request.log.error({ err: error }, 'erro inesperado')
    return reply.status(500).send(body('INTERNAL', 'Algo deu errado do nosso lado.'))
  })
}

/** 404 da API, em JSON. O app decide onde ligar: sozinho ou atrás do front. */
export const sendNotFound = (reply: FastifyReply) =>
  reply.status(404).send(body('NOT_FOUND', 'Rota não encontrada.'))
