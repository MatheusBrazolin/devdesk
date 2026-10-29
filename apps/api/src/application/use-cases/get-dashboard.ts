import { createHash } from 'node:crypto'
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

/**
 * Até aqui o retrato guardado é servido sem buscar outro. Curto para PR e
 * issue novos aparecerem em segundos; o front pergunta a cada 30 s.
 */
export const FRESH_MS = 20_000
/** Depois de uma atualização por trás falhar, espera isto antes de tentar de novo. */
export const RETRY_AFTER_FAILURE_MS = 60_000
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
  /** Quando a última atualização por trás falhou, por chave. */
  private readonly failedAt = new Map<string, number>()

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
    // Só um hash curto vai para o banco, nunca um pedaço do token.
    const credential = createHash('sha256').update(accessToken).digest('hex').slice(0, 16)
    const key = `${user.id}:${credential}`

    // Token recusado numa atualização por trás: não esconder isso atrás de dados velhos.
    if (refresh || this.needsReconnect.has(key)) {
      return { snapshot: await this.fetchAndStore(user.id, credential, accessToken), stale: false }
    }

    const cached = await this.cache.get(user.id, credential)
    const age = cached ? this.clock.now().getTime() - cached.fetchedAt.getTime() : Infinity

    if (cached && age < FRESH_MS) return { snapshot: cached, stale: false }
    if (cached && age < MAX_STALE_MS) {
      // O GitHub acabou de falhar (cota, fora do ar): serve o guardado sem pedir de novo, e
      // sem "stale", para o front não perguntar a cada 3 s enquanto o GitHub não volta.
      const failed = this.failedAt.get(key)
      const now = this.clock.now().getTime()
      if (failed !== undefined && now - failed < RETRY_AFTER_FAILURE_MS) {
        return { snapshot: cached, stale: false }
      }
      this.fetchAndStore(user.id, credential, accessToken).catch((error: unknown) => {
        if (error instanceof AppError && error.code === 'GITHUB_RECONNECT')
          this.needsReconnect.add(key)
        else this.failedAt.set(key, this.clock.now().getTime())
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
      this.failedAt.delete(key)
      return snapshot
    })().finally(() => this.inFlight.delete(key))
    this.inFlight.set(key, fetching)
    return fetching
  }
}
