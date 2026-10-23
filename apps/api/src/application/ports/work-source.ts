import type { WorkSnapshot } from '../../domain/work.js'

/** De onde vem o trabalho de alguém: o GitHub de verdade ou os dados de exemplo. */
export interface WorkSource {
  fetchSnapshot(accessToken: string): Promise<WorkSnapshot>
}

export interface SnapshotCache {
  get(key: string): WorkSnapshot | undefined
  set(key: string, snapshot: WorkSnapshot): void
}
