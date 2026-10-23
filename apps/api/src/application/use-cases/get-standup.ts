import type { Activity } from '../../domain/activity.js'
import { buildStandup, type StandupParts } from '../../domain/standup.js'
import type { User } from '../../domain/user.js'
import type { ActivitySource } from '../ports/activity-source.js'
import type { Clock } from '../ports/security.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'
import type { GetDashboard } from './get-dashboard.js'

export interface StandupResult extends StandupParts {
  isSample: boolean
}

const CACHE_MS = 60_000

/**
 * O standup do dia: o que foi feito no período (atividade no GitHub), o que
 * pede atenção hoje e o que está travado. O "hoje" do calendário fica com o
 * front, que sabe o fuso de quem pede.
 */
export class GetStandup {
  /** A atividade de um período passado quase não muda: guarda por um minuto. */
  private readonly cache = new Map<string, { at: number; activity: Activity }>()

  constructor(
    private readonly dashboard: GetDashboard,
    private readonly sources: { github: ActivitySource; sample: ActivitySource },
    private readonly tokens: GitHubTokenProvider,
    private readonly clock: Clock,
  ) {}

  async execute(user: User, from: Date, to: Date): Promise<StandupResult> {
    const [activity, { snapshot }] = await Promise.all([
      this.activity(user, from, to),
      this.dashboard.execute(user),
    ])
    return { ...buildStandup(activity, snapshot, this.clock.now()), isSample: snapshot.isSample }
  }

  private async activity(user: User, from: Date, to: Date): Promise<Activity> {
    if (user.isDemo) return this.sources.sample.fetchActivity('', user.login, from, to)

    const key = `${user.id}:${from.toISOString()}:${to.toISOString()}`
    const now = this.clock.now().getTime()
    const cached = this.cache.get(key)
    if (cached && now - cached.at < CACHE_MS) return cached.activity

    const token = await this.tokens.getAccessToken(user.id)
    const activity = await this.sources.github.fetchActivity(token, user.login, from, to)
    this.cache.set(key, { at: now, activity })
    if (this.cache.size > 200) this.cache.delete(this.cache.keys().next().value!)
    return activity
  }
}
