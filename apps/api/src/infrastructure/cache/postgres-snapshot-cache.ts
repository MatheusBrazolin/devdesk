import { and, eq, sql } from 'drizzle-orm'
import type { SnapshotCache } from '../../application/ports/work-source.js'
import type { WorkSnapshot } from '../../domain/work.js'
import type { Database } from '../db/client.js'
import { dashboardSnapshots } from '../db/schema.js'
import { decodeSnapshot, encodeSnapshot } from './snapshot-codec.js'

/**
 * Segunda camada: o último retrato de cada pessoa no Postgres. Com ela, o
 * primeiro painel depois de reiniciar a API também abre na hora.
 */
export class PostgresSnapshotCache implements SnapshotCache {
  constructor(private readonly db: Database) {}

  async get(userId: string, credential: string): Promise<WorkSnapshot | undefined> {
    const [row] = await this.db
      .select({ data: dashboardSnapshots.data })
      .from(dashboardSnapshots)
      .where(
        and(eq(dashboardSnapshots.userId, userId), eq(dashboardSnapshots.credential, credential)),
      )
      .limit(1)
    return row ? decodeSnapshot(row.data) : undefined
  }

  /** Um retrato por pessoa: o novo substitui o anterior, de qualquer credencial. */
  async set(userId: string, credential: string, snapshot: WorkSnapshot): Promise<void> {
    const values = {
      userId,
      credential,
      data: encodeSnapshot(snapshot),
      fetchedAt: snapshot.fetchedAt,
    }
    await this.db
      .insert(dashboardSnapshots)
      .values(values)
      .onConflictDoUpdate({
        target: dashboardSnapshots.userId,
        set: values,
        // Uma busca antiga que termina depois de uma nova não apaga o retrato mais recente.
        setWhere: sql`excluded.fetched_at > ${dashboardSnapshots.fetchedAt}`,
      })
  }
}

/**
 * Memória na frente, Postgres atrás: lê da primeira que tiver, grava nas duas.
 * O Postgres aqui é só um atalho: se ele falhar, o painel segue com a memória
 * e o GitHub, em vez de cair.
 */
export class LayeredSnapshotCache implements SnapshotCache {
  constructor(
    private readonly memory: SnapshotCache,
    private readonly persistent: SnapshotCache,
  ) {}

  async get(userId: string, credential: string): Promise<WorkSnapshot | undefined> {
    const fromMemory = await this.memory.get(userId, credential)
    if (fromMemory) return fromMemory
    const stored = await this.persistent.get(userId, credential).catch(() => undefined)
    if (stored) await this.memory.set(userId, credential, stored)
    return stored
  }

  async set(userId: string, credential: string, snapshot: WorkSnapshot): Promise<void> {
    await this.memory.set(userId, credential, snapshot)
    await this.persistent.set(userId, credential, snapshot).catch(() => undefined)
  }
}
