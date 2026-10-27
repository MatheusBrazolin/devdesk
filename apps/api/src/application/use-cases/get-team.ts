import { computeTeam, type Team, teamRepositories } from '../../domain/team.js'
import type { User } from '../../domain/user.js'
import type { Clock } from '../ports/security.js'
import type { TeamSource } from '../ports/team-source.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'
import type { GetDashboard } from './get-dashboard.js'
import type { UserSettings } from './user-settings.js'

/** A fila do time muda ao longo do dia, mas não a cada segundo: 5 minutos poupam a cota. */
const CACHE_MS = 5 * 60_000

export interface TeamResult extends Team {
  isSample: boolean
  fetchedAt: Date
}

/** Painel do time: os PRs abertos dos repositórios em que a pessoa trabalha. Só leitura. */
export class GetTeam {
  /** Por pessoa, junto com os repositórios usados: trocar o time nas configurações refaz a busca. */
  private readonly cache = new Map<string, { result: TeamResult; key: string }>()

  constructor(
    private readonly dashboard: GetDashboard,
    private readonly sources: { github: TeamSource; sample: TeamSource },
    private readonly tokens: GitHubTokenProvider,
    private readonly settings: UserSettings,
    private readonly clock: Clock,
  ) {}

  /** Esquece o resultado guardado: o token mudou e o GitHub pode mostrar outra coisa. */
  forget(userId: string): void {
    this.cache.delete(userId)
  }

  async execute(user: User): Promise<TeamResult> {
    const now = this.clock.now()
    if (user.isDemo) {
      const { pullRequests, repositories } = await this.sources.sample.fetchOpenPullRequests(
        '',
        user.login,
        [],
      )
      return { ...computeTeam(pullRequests, repositories, now), isSample: true, fetchedAt: now }
    }

    const chosen = (await this.settings.get(user.id)).teamRepositories
    const key = chosen?.join(',') ?? 'auto'
    const cached = this.cache.get(user.id)
    if (cached?.key === key && now.getTime() - cached.result.fetchedAt.getTime() < CACHE_MS) {
      return cached.result
    }

    // Sem escolha nas configurações, os repositórios saem do painel, que já está em cache.
    const candidates = chosen ?? teamRepositories((await this.dashboard.execute(user)).snapshot)
    const token = await this.tokens.getAccessToken(user.id)
    const { pullRequests, repositories } = await this.sources.github.fetchOpenPullRequests(
      token,
      user.login,
      candidates,
    )
    const result = {
      ...computeTeam(pullRequests, repositories, now),
      isSample: false,
      fetchedAt: now,
    }
    this.cache.set(user.id, { result, key })
    if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value!)
    return result
  }
}
