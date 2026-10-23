import { type AttentionItem, buildAttentionList } from '../../domain/attention.js'
import type { User } from '../../domain/user.js'
import type { WorkSnapshot } from '../../domain/work.js'
import type { SnapshotCache, WorkSource } from '../ports/work-source.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'

export interface DashboardResult {
  snapshot: WorkSnapshot
  attention: AttentionItem[]
}

interface Sources {
  github: WorkSource
  /** Usada pelo usuário de demonstração, que não tem conta no GitHub. */
  sample: WorkSource
}

export class GetDashboard {
  constructor(
    private readonly sources: Sources,
    private readonly tokens: GitHubTokenProvider,
    private readonly cache: SnapshotCache,
  ) {}

  async execute(user: User, options: { refresh?: boolean } = {}): Promise<DashboardResult> {
    const snapshot = await this.loadSnapshot(user, options.refresh ?? false)
    return { snapshot, attention: buildAttentionList(snapshot) }
  }

  private async loadSnapshot(user: User, refresh: boolean): Promise<WorkSnapshot> {
    if (user.isDemo) return this.sources.sample.fetchSnapshot('')

    const accessToken = await this.tokens.getAccessToken(user.id)
    // A chave inclui o token: depois de outro login (OAuth ↔ token pessoal) ou
    // de uma renovação, o que estava guardado com a credencial antiga não vale.
    const key = `${user.id}:${accessToken.slice(-8)}`

    if (!refresh) {
      const cached = this.cache.get(key)
      if (cached) return cached
    }

    const snapshot = await this.sources.github.fetchSnapshot(accessToken)
    this.cache.set(key, snapshot)
    return snapshot
  }
}
