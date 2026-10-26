import { computeTeam, type Team, teamRepositories } from '../../domain/team.js'
import type { User } from '../../domain/user.js'
import type { Clock } from '../ports/security.js'
import type { TeamSource } from '../ports/team-source.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'
import type { GetDashboard } from './get-dashboard.js'

/** A fila do time muda ao longo do dia, mas não a cada segundo: 5 minutos poupam a cota. */
const CACHE_MS = 5 * 60_000

export interface TeamResult extends Team {
  isSample: boolean
  fetchedAt: Date
}

/** Painel do time: os PRs abertos dos repositórios em que a pessoa trabalha. Só leitura. */
export class GetTeam {
  private readonly cache = new Map<string, TeamResult>()

  constructor(
    private readonly dashboard: GetDashboard,
    private readonly sources: { github: TeamSource; sample: TeamSource },
    private readonly tokens: GitHubTokenProvider,
    private readonly clock: Clock,
  ) {}

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

    const cached = this.cache.get(user.id)
    if (cached && now.getTime() - cached.fetchedAt.getTime() < CACHE_MS) return cached

    // Os repositórios saem do painel, que já está em cache: não custa outra ida ao GitHub.
    const { snapshot } = await this.dashboard.execute(user)
    const token = await this.tokens.getAccessToken(user.id)
    const { pullRequests, repositories } = await this.sources.github.fetchOpenPullRequests(
      token,
      user.login,
      teamRepositories(snapshot),
    )
    const result = {
      ...computeTeam(pullRequests, repositories, now),
      isSample: false,
      fetchedAt: now,
    }
    this.cache.set(user.id, result)
    if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value!)
    return result
  }
}
