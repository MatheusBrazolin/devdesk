import { eq } from 'drizzle-orm'
import type { SessionRepository } from '../../application/ports/session-repository.js'
import type { Session } from '../../domain/session.js'
import type { Database } from '../db/client.js'
import { sessions } from '../db/schema.js'

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: Database) {}

  async create(session: Session): Promise<void> {
    await this.db.insert(sessions).values(session)
  }

  async findById(id: string): Promise<Session | null> {
    const [row] = await this.db.select().from(sessions).where(eq(sessions.id, id)).limit(1)
    return row ?? null
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id))
  }
}
