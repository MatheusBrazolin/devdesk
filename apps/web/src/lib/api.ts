import { type ApiErrorCode, apiErrorSchema } from '@devdesk/shared'

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

export const isUnauthenticated = (error: unknown) =>
  error instanceof ApiRequestError && error.code === 'UNAUTHENTICATED'

/** Cliente único da API. Todo erro sai como ApiRequestError, com código conhecido. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: { accept: 'application/json', ...init.headers },
    })
  } catch {
    throw new ApiRequestError(0, 'UPSTREAM', 'Não foi possível falar com o servidor.')
  }

  if (response.status === 204) return undefined as T

  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body)
    if (parsed.success) {
      throw new ApiRequestError(response.status, parsed.data.error.code, parsed.data.error.message)
    }
    throw new ApiRequestError(response.status, 'INTERNAL', `Erro inesperado (${response.status}).`)
  }
  return body as T
}
