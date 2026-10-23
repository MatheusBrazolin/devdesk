import type { GitHubTokens } from '../../domain/github-tokens.js'
import type { GitHubProfile } from './user-repository.js'

export interface GitHubOAuth {
  authorizeUrl(state: string): string
  exchangeCode(code: string): Promise<GitHubTokens>
  /** Troca um refresh token por tokens novos. O antigo deixa de valer. */
  refreshTokens(refreshToken: string): Promise<GitHubTokens>
  fetchProfile(accessToken: string): Promise<GitHubProfile>
}
