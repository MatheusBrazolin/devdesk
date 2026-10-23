import type { User } from '../../domain/user.js'

export interface GitHubProfile {
  githubId: number
  login: string
  name: string | null
  avatarUrl: string | null
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  /** Cria ou atualiza pelo githubId, guardando o token já cifrado. */
  upsertFromGitHub(profile: GitHubProfile, encryptedAccessToken: string): Promise<User>
  /** O usuário de demonstração é um só, criado na primeira vez. */
  findOrCreateDemo(): Promise<User>
}
