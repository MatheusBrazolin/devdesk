import type { GitHubProfile } from './user-repository.js'

export interface TokenInspection {
  profile: GitHubProfile
  /** Escopos de um token classic. Nulo nos fine-grained, que não informam escopos. */
  scopes: string[] | null
}

/** De quem é um token do GitHub e o que ele pode ler. */
export interface GitHubTokenInspector {
  inspect(accessToken: string): Promise<TokenInspection>
}
