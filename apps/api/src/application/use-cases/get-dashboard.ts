import { type AttentionItem, buildAttentionList } from '../../domain/attention.js'
import { AppError } from '../../domain/errors.js'
import type { User } from '../../domain/user.js'
import type { WorkSnapshot } from '../../domain/work.js'
import type { Clock } from '../ports/security.js'
import type { SnapshotCache, WorkSource } from '../ports/work-source.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'

export interface DashboardResult {
  snapshot: WorkSnapshot
  attention: AttentionItem[]
  /** Verdadeiro quando é o retrato guardado e um novo está sendo buscado. */
  stale: boolean
}

interface Sources {
  github: WorkSource
  /** Usada pelo usuário de demonstração, que não tem conta no GitHub. */
  sample: WorkSource
}

/** Até aqui o retrato guardado é servido sem buscar outro. */
export const FRESH_MS = 60_000
/** Até aqui ele ainda é servido na hora, enquanto um novo é buscado por trás. */
export const MAX_STALE_MS = 24 * 60 * 60 * 1000

/**
 * Monta o painel no modelo "stale-while-revalidate": responde na hora com o
 * último retrato e atualiza por trás, para ninguém esperar o GitHub (2 s ou
 * mais) a cada vez que abre a página.
 */
export class GetDashboard {
  /** Buscas em andamento por chave: duas abas não disparam duas buscas. */
  private readonly inFlight = new Map<string, Promise<WorkSnapshot>>()
  /** Chaves cuja atualização por trás descobriu um token recusado. */
  private readonly needsReconnect = new Set<string>()

  constructor(
    private readonly sources: Sources,
    private readonly tokens: GitHubTokenProvider,
    private readonly cache: SnapshotCache,
    private readonly clock: Clock,
  ) {}

  async execute(user: User, options: { refresh?: boolean } = {}): Promise<DashboardResult> {
    const { snapshot, stale } = await this.loadSnapshot(user, options.refresh ?? false)
    return { snapshot, attention: buildAttentionList(snapshot), stale }
  }

  private async loadSnapshot(
    user: User,
    refresh: boolean,
  ): Promise<{ snapshot: WorkSnapshot; stale: boolean }> {
    if (user.isDemo) return { snapshot: await this.sources.sample.fetchSnapshot(''), stale: false }

    const accessToken = await this.tokens.getAccessToken(user.id)
    // A credencial entra na chave: outro login ou um token renovado não herdam o retrato antigo.
    const credential = accessToken.slice(-8)
    const key = `${user.id}:${credential}`

    // Token recusado numa atualização por trás: não esconder isso atrás de dados velhos.
    if (refresh || this.needsReconnect.has(key)) {
      return { snapshot: await this.fetchAndStore(user.id, credential, accessToken), stale: false }
    }

    const cached = await this.cache.get(user.id, credential)
    const age = cached ? this.clock.now().getTime() - cached.fetchedAt.getTime() : Infinity

    if (cached && age < FRESH_MS) return { snapshot: cached, stale: false }
    if (cached && age < MAX_STALE_MS) {
      this.fetchAndStore(user.id, credential, accessToken).catch((error: unknown) => {
        if (error instanceof AppError && error.code === 'GITHUB_RECONNECT')
          this.needsReconnect.add(key)
        // Outras falhas: o retrato guardado continua valendo, e a próxima requisição tenta de novo.
      })
      return { snapshot: cached, stale: true }
    }
    return { snapshot: await this.fetchAndStore(user.id, credential, accessToken), stale: false }
  }

  private fetchAndStore(
    userId: string,
    credential: string,
    accessToken: string,
  ): Promise<WorkSnapshot> {
    const key = `${userId}:${credential}`
    const pending = this.inFlight.get(key)
    if (pending) return pending

    const fetching = (async () => {
      const snapshot = await this.sources.github.fetchSnapshot(accessToken)
      await this.cache.set(userId, credential, snapshot)
      this.needsReconnect.delete(key)
      return snapshot
    })().finally(() => this.inFlight.delete(key))
    this.inFlight.set(key, fetching)
    return fetching
  }
}
