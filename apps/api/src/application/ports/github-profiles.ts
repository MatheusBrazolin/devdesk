import type { GitHubProfile } from './user-repository.js'

/** Quem é o dono de um token do GitHub. */
export interface GitHubProfiles {
  fetchProfile(accessToken: string): Promise<GitHubProfile>
}
