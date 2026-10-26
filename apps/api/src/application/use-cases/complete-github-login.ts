import type { GitHubTokens } from '../../domain/github-tokens.js'
import type { GitHubOAuth } from '../ports/github-oauth.js'
import type { GitHubProfiles } from '../ports/github-profiles.js'
import type { GitHubProfile, UserRepository } from '../ports/user-repository.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'
import type { CreateSession, CreatedSession } from './create-session.js'

/**
 * Token pessoal do dono da instalação. Num OAuth App, as organizações que
 * bloqueiam apps de terceiros ficam de fora; o token pessoal age como a
 * própria pessoa e enxerga tudo, sem pedir nada às organizações.
 */
export interface OwnerToken {
  token: string
  profiles: GitHubProfiles
}

/**
 * Troca o code do OAuth por tokens, registra o usuário e abre a sessão.
 *
 * O OAuth prova quem está entrando. Se for o dono do token pessoal (mesmo
 * ID numérico no GitHub, que não muda como o login), os dados passam a vir
 * do token pessoal. Qualquer outra pessoa segue com o próprio token do
 * OAuth e nunca toca no do dono.
 */
export class CompleteGitHubLogin {
  constructor(
    private readonly github: GitHubOAuth,
    private readonly users: UserRepository,
    private readonly tokens: GitHubTokenProvider,
    private readonly createSession: CreateSession,
    private readonly owner: OwnerToken | null = null,
  ) {}

  async execute(code: string): Promise<CreatedSession> {
    const tokens = await this.github.exchangeCode(code)
    const profile = await this.github.fetchProfile(tokens.accessToken)
    const user = await this.users.upsertFromGitHub(profile)
    await this.tokens.save(user.id, (await this.ownerTokenFor(profile)) ?? tokens)
    return this.createSession.execute(user.id)
  }

  /** O token pessoal, se quem entrou é o dono dele; senão, nada. */
  private async ownerTokenFor(profile: GitHubProfile): Promise<GitHubTokens | null> {
    if (!this.owner) return null
    try {
      const owner = await this.owner.profiles.fetchProfile(this.owner.token)
      if (owner.githubId !== profile.githubId) return null
    } catch {
      // Token pessoal revogado ou GitHub fora: entra com o OAuth, como qualquer um.
      return null
    }
    return {
      accessToken: this.owner.token,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    }
  }
}
