import type { GitHubOAuth } from '../ports/github-oauth.js'
import type { UserRepository } from '../ports/user-repository.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'
import type { CreateSession, CreatedSession } from './create-session.js'

/** Troca o code do OAuth por tokens, registra o usuário e abre a sessão. */
export class CompleteGitHubLogin {
  constructor(
    private readonly github: GitHubOAuth,
    private readonly users: UserRepository,
    private readonly tokens: GitHubTokenProvider,
    private readonly createSession: CreateSession,
  ) {}

  async execute(code: string): Promise<CreatedSession> {
    const tokens = await this.github.exchangeCode(code)
    const profile = await this.github.fetchProfile(tokens.accessToken)
    const user = await this.users.upsertFromGitHub(profile)
    await this.tokens.save(user.id, tokens)
    return this.createSession.execute(user.id)
  }
}
