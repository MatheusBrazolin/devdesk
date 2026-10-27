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

/** Token pessoal colado pela própria pessoa, já cifrado. */
export interface EncryptedPersonalToken {
  token: string
  savedAt: Date
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  /** Cria ou atualiza pelo githubId. */
  upsertFromGitHub(profile: GitHubProfile): Promise<User>
  findGitHubTokens(userId: string): Promise<EncryptedGitHubTokens | null>
  saveGitHubTokens(userId: string, tokens: EncryptedGitHubTokens): Promise<void>
  findPersonalToken(userId: string): Promise<EncryptedPersonalToken | null>
  /** Nulo apaga: a pessoa volta para o token do OAuth. */
  savePersonalToken(userId: string, token: EncryptedPersonalToken | null): Promise<void>
  /**
   * Cada visita ao modo demonstração ganha um usuário próprio: numa demo
   * pública, o que um visitante escreve não aparece para o próximo.
   */
  createDemo(now: Date): Promise<User>
  /** Apaga os usuários demo criados antes do instante; notas e eventos vão junto. */
  deleteDemosCreatedBefore(date: Date): Promise<number>
  /** Apaga a pessoa e, pelas chaves com cascade, tudo o que é dela. */
  delete(id: string): Promise<void>
}
