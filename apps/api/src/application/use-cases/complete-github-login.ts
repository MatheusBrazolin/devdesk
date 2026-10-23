import type { GitHubOAuth } from '../ports/github-oauth.js'
import type { TokenCipher } from '../ports/security.js'
import type { UserRepository } from '../ports/user-repository.js'
import type { CreateSession, CreatedSession } from './create-session.js'

/** Troca o code do OAuth por token, registra o usuário e abre a sessão. */
export class CompleteGitHubLogin {
  constructor(
    private readonly github: GitHubOAuth,
    private readonly users: UserRepository,
    private readonly cipher: TokenCipher,
    private readonly createSession: CreateSession,
  ) {}

  async execute(code: string): Promise<CreatedSession> {
    const accessToken = await this.github.exchangeCode(code)
    const profile = await this.github.fetchProfile(accessToken)
    const user = await this.users.upsertFromGitHub(profile, this.cipher.encrypt(accessToken))
    return this.createSession.execute(user.id)
  }
}
