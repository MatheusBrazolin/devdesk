/** O que o token enxerga agora: validade, organizações e cota da API. */
export interface GitHubAccountSnapshot {
  /** Só tokens pessoais com validade dizem quando vencem; os outros, nulo. */
  expiresAt: Date | null
  organizations: { login: string; avatarUrl: string | null }[]
  rateLimit: { remaining: number; limit: number; resetAt: Date } | null
}

export interface GitHubAccount {
  snapshot(accessToken: string): Promise<GitHubAccountSnapshot>
}
