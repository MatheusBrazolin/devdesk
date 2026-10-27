import { AppError, forbidden } from '../../domain/errors.js'
import type { User } from '../../domain/user.js'
import type { GitHubTokenInspector } from '../ports/github-token-inspector.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'

export interface PersonalTokenStatus {
  connected: boolean
  savedAt: Date | null
}

/** Escopos de um token classic que o painel precisa para ler repositórios privados e organizações. */
export const REQUIRED_SCOPES = ['repo', 'read:org'] as const

/** O que guarda resultados por pessoa e precisa esquecer quando o token muda. */
interface PerUserCache {
  forget(userId: string): void
}

/**
 * Token pessoal colado pela própria pessoa. Organizações que bloqueiam apps
 * de terceiros escondem os repositórios delas do token do OAuth; um token
 * pessoal age como a pessoa e enxerga o mesmo que ela no github.com, sem
 * pedir nada à organização. Só leitura, como todo o DevDesk.
 */
export class PersonalGitHubToken {
  constructor(
    private readonly inspector: GitHubTokenInspector,
    private readonly tokens: GitHubTokenProvider,
    private readonly caches: PerUserCache[],
  ) {}

  async status(user: User): Promise<PersonalTokenStatus> {
    if (user.isDemo) return { connected: false, savedAt: null }
    const savedAt = await this.tokens.personalSavedAt(user.id)
    return { connected: savedAt !== null, savedAt }
  }

  async connect(user: User, token: string): Promise<PersonalTokenStatus> {
    if (user.isDemo) throw forbidden('No modo demonstração não há conta do GitHub para ligar.')

    let inspection
    try {
      inspection = await this.inspector.inspect(token)
    } catch (cause) {
      throw new AppError(
        'VALIDATION',
        'O GitHub recusou esse token. Confira se ele foi copiado inteiro e não expirou.',
        { cause },
      )
    }
    // O token passa a agir como a pessoa: só vale um token da mesma conta.
    if (inspection.profile.githubId !== user.githubId) {
      throw new AppError(
        'VALIDATION',
        `Esse token é da conta @${inspection.profile.login}, não da @${user.login}. Gere um token entrando com a sua conta.`,
      )
    }
    const missing =
      inspection.scopes && REQUIRED_SCOPES.filter((scope) => !inspection.scopes!.includes(scope))
    if (missing && missing.length > 0) {
      throw new AppError(
        'VALIDATION',
        `Falta marcar ${missing.map((scope) => `"${scope}"`).join(' e ')} ao gerar o token.`,
      )
    }

    await this.tokens.savePersonal(user.id, token)
    this.forget(user.id)
    return this.status(user)
  }

  async disconnect(user: User): Promise<PersonalTokenStatus> {
    if (user.isDemo) throw forbidden('No modo demonstração não há conta do GitHub para ligar.')
    await this.tokens.savePersonal(user.id, null)
    this.forget(user.id)
    return this.status(user)
  }

  private forget(userId: string): void {
    for (const cache of this.caches) cache.forget(userId)
  }
}
