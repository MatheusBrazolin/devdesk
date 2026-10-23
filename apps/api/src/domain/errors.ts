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
