import { githubReconnect } from '../../domain/errors.js'
import { canRefresh, type GitHubTokens, needsRefresh } from '../../domain/github-tokens.js'
import type { GitHubOAuth } from '../ports/github-oauth.js'
import type { Clock, TokenCipher } from '../ports/security.js'
import type { UserRepository } from '../ports/user-repository.js'

/**
 * Guarda os tokens do GitHub cifrados e entrega sempre um token válido,
 * renovando antes de expirar.
 */
export class GitHubTokenProvider {
  /** Leituras em andamento por usuário: o refresh token só vale uma vez. */
  private readonly inFlight = new Map<string, Promise<string>>()

  constructor(
    private readonly users: UserRepository,
    /** Nulo sem OAuth configurado: aí não há como renovar. */
    private readonly oauth: GitHubOAuth | null,
    private readonly cipher: TokenCipher,
    private readonly clock: Clock,
  ) {}

  async save(userId: string, tokens: GitHubTokens): Promise<void> {
    await this.users.saveGitHubTokens(userId, {
      ...tokens,
      accessToken: this.cipher.encrypt(tokens.accessToken),
      refreshToken: tokens.refreshToken && this.cipher.encrypt(tokens.refreshToken),
    })
  }

  /**
   * A promessa é registrada antes de qualquer await: chamadas simultâneas
   * do mesmo usuário compartilham a mesma leitura e, se for o caso, a mesma
   * renovação.
   */
  getAccessToken(userId: string): Promise<string> {
    const pending = this.inFlight.get(userId)
    if (pending) return pending

    const resolving = this.resolve(userId).finally(() => this.inFlight.delete(userId))
    this.inFlight.set(userId, resolving)
    return resolving
  }

  private async resolve(userId: string): Promise<string> {
    const stored = await this.users.findGitHubTokens(userId)
    if (!stored) throw githubReconnect()

    const now = this.clock.now()
    if (!needsRefresh(stored, now)) return this.cipher.decrypt(stored.accessToken)
    if (!canRefresh(stored, now) || !this.oauth) throw githubReconnect()

    return this.refresh(userId, this.cipher.decrypt(stored.refreshToken!), this.oauth)
  }

  private async refresh(userId: string, refreshToken: string, oauth: GitHubOAuth): Promise<string> {
    // Um refresh recusado (revogado ou já usado) sai como GITHUB_RECONNECT.
    const tokens = await oauth.refreshTokens(refreshToken)
    await this.save(userId, tokens)
    return tokens.accessToken
  }
}
