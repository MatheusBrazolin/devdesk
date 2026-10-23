import type { Session } from '../../domain/session.js'

export interface SessionRepository {
  create(session: Session): Promise<void>
  findById(id: string): Promise<Session | null>
  delete(id: string): Promise<void>
}
