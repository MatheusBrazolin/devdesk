import { computeMetrics, type Metrics, metricsStart } from '../../domain/metrics.js'
import type { User } from '../../domain/user.js'
import type { MetricsSource } from '../ports/metrics-source.js'
import type { Clock } from '../ports/security.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'

export const METRICS_WEEKS = 8
/** Semanas passadas quase não mudam: guarda por 10 minutos, poupando a cota do GitHub. */
const CACHE_MS = 10 * 60_000

export interface MetricsResult extends Metrics {
  isSample: boolean
  fetchedAt: Date
}

/** Minhas métricas: as últimas oito semanas de entrega e de review. */
export class GetMetrics {
  private readonly cache = new Map<string, MetricsResult>()

  constructor(
    private readonly sources: { github: MetricsSource; sample: MetricsSource },
    private readonly tokens: GitHubTokenProvider,
    private readonly clock: Clock,
  ) {}

  async execute(user: User): Promise<MetricsResult> {
    const now = this.clock.now()
    const from = metricsStart(now, METRICS_WEEKS)
    if (user.isDemo) {
      const data = await this.sources.sample.fetchMetrics('', user.login, from, now)
      return { ...computeMetrics(data, now, METRICS_WEEKS), isSample: true, fetchedAt: now }
    }

    const cached = this.cache.get(user.id)
    if (cached && now.getTime() - cached.fetchedAt.getTime() < CACHE_MS) return cached

    const token = await this.tokens.getAccessToken(user.id)
    const data = await this.sources.github.fetchMetrics(token, user.login, from, now)
    const result = { ...computeMetrics(data, now, METRICS_WEEKS), isSample: false, fetchedAt: now }
    this.cache.set(user.id, result)
    if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value!)
    return result
  }
}
