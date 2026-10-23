import type { WorkSnapshot } from '../../domain/work.js'

/** De onde vem o trabalho de alguém: o GitHub de verdade ou os dados de exemplo. */
export interface WorkSource {
  fetchSnapshot(accessToken: string): Promise<WorkSnapshot>
}

/**
 * Guarda o último retrato de cada pessoa. A chave inclui a credencial, para
 * um retrato tirado com outro token não ser servido depois de um novo login.
 * Quem decide se o retrato ainda serve é o caso de uso, pela data dele.
 */
export interface SnapshotCache {
  get(userId: string, credential: string): Promise<WorkSnapshot | undefined>
  set(userId: string, credential: string, snapshot: WorkSnapshot): Promise<void>
}
