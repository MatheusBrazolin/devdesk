import type { GitHubTokens } from '../../domain/github-tokens.js'
import type { User } from '../../domain/user.js'

export interface GitHubProfile {
  githubId: number
  login: string
  name: string | null
  avatarUrl: string | null
}

/** Mesmo formato de GitHubTokens, mas com os tokens já cifrados. */
export type EncryptedGitHubTokens = GitHubTokens

export interface UserRepository {
  findById(id: string): Promise<User | null>
  /** Cria ou atualiza pelo githubId. */
  upsertFromGitHub(profile: GitHubProfile): Promise<User>
  findGitHubTokens(userId: string): Promise<EncryptedGitHubTokens | null>
  saveGitHubTokens(userId: string, tokens: EncryptedGitHubTokens): Promise<void>
  /** O usuário de demonstração é um só, criado na primeira vez. */
  findOrCreateDemo(): Promise<User>
}
