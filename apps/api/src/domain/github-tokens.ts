/** Tokens de um login no GitHub. Datas nulas significam "não expira". */
export interface GitHubTokens {
  accessToken: string
  accessTokenExpiresAt: Date | null
  refreshToken: string | null
  refreshTokenExpiresAt: Date | null
}

/** Renova um pouco antes do fim, para não usar um token que expira no meio da requisição. */
export const REFRESH_MARGIN_MS = 5 * 60 * 1000

export function needsRefresh(tokens: GitHubTokens, now: Date): boolean {
  return (
    tokens.accessTokenExpiresAt !== null &&
    tokens.accessTokenExpiresAt.getTime() - now.getTime() <= REFRESH_MARGIN_MS
  )
}

export function canRefresh(tokens: GitHubTokens, now: Date): boolean {
  return (
    tokens.refreshToken !== null &&
    (tokens.refreshTokenExpiresAt === null ||
      tokens.refreshTokenExpiresAt.getTime() > now.getTime())
  )
}
