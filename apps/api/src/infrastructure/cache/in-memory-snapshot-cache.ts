import type { Clock } from '../../application/ports/security.js'
import type { SnapshotCache } from '../../application/ports/work-source.js'
import type { WorkSnapshot } from '../../domain/work.js'

/**
 * Cache por processo, com validade curta: segura o limite de requisições do
 * GitHub sem deixar o painel velho. Basta para uma instância só da API.
 */
export class InMemorySnapshotCache implements SnapshotCache {
  private readonly entries = new Map<string, WorkSnapshot>()

  constructor(
    private readonly clock: Clock,
    private readonly ttlMs = 60_000,
  ) {}

  get(key: string): WorkSnapshot | undefined {
    const entry = this.entries.get(key)
    if (!entry) return undefined
    if (this.clock.now().getTime() - entry.fetchedAt.getTime() >= this.ttlMs) {
      this.entries.delete(key)
      return undefined
    }
    return entry
  }

  set(key: string, snapshot: WorkSnapshot): void {
    this.entries.set(key, snapshot)
  }
}
