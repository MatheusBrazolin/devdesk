import type { ApiErrorCode } from '@devdesk/shared'

/** Erro esperado do negócio. A camada HTTP traduz o código em status. */
export class AppError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AppError'
  }
}

export const unauthenticated = (message = 'Sessão inválida ou expirada.') =>
  new AppError('UNAUTHENTICATED', message)

export const forbidden = (message: string) => new AppError('FORBIDDEN', message)

export const upstream = (message: string, cause?: unknown) =>
  new AppError('UPSTREAM', message, { cause })

export const githubReconnect = (message = 'O GitHub recusou o acesso. Conecte a conta de novo.') =>
  new AppError('GITHUB_RECONNECT', message)

/**
 * Falhas do GitHub que não são culpa de quem usa. A mensagem é fixa e amigável
 * (o front traduz pelo dicionário); o detalhe técnico vai na causa, que o
 * tratador de erros registra no log.
 */
export const GITHUB_UNAVAILABLE = 'O GitHub não respondeu agora. Tente de novo em instantes.'
export const GITHUB_UNEXPECTED =
  'O GitHub respondeu de um jeito inesperado. Tente de novo em instantes.'

export const githubUnavailable = (detail: string, cause?: unknown) =>
  upstream(GITHUB_UNAVAILABLE, new Error(detail, { cause }))

export const githubUnexpected = (detail: string, cause?: unknown) =>
  upstream(GITHUB_UNEXPECTED, new Error(detail, { cause }))
