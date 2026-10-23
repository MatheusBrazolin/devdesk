import type { SnapshotCache } from '../../application/ports/work-source.js'
import type { WorkSnapshot } from '../../domain/work.js'

const MAX_ENTRIES = 200

/** Primeira camada: memória do processo. Some quando a API reinicia. */
export class InMemorySnapshotCache implements SnapshotCache {
  private readonly entries = new Map<string, WorkSnapshot>()

  async get(userId: string, credential: string): Promise<WorkSnapshot | undefined> {
    return this.entries.get(`${userId}:${credential}`)
  }

  async set(userId: string, credential: string, snapshot: WorkSnapshot): Promise<void> {
    const key = `${userId}:${credential}`
    this.entries.delete(key)
    this.entries.set(key, snapshot)
    // Map guarda a ordem de inserção: o primeiro é o mais antigo.
    if (this.entries.size > MAX_ENTRIES) this.entries.delete(this.entries.keys().next().value!)
  }
}
