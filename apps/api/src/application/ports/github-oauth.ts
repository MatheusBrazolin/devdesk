import type { GitHubProfile } from './user-repository.js'

export interface GitHubOAuth {
  authorizeUrl(state: string): string
  exchangeCode(code: string): Promise<string>
  fetchProfile(accessToken: string): Promise<GitHubProfile>
}
