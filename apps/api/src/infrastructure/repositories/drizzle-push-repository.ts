import { and, eq } from 'drizzle-orm'
import type { PushRepository } from '../../application/ports/push.js'
import type { PushSubscription } from '../../domain/push.js'
import type { Database } from '../db/client.js'
import { pushSeen, pushSubscriptions } from '../db/schema.js'

export class DrizzlePushRepository implements PushRepository {
  constructor(private readonly db: Database) {}

  async save(userId: string, { endpoint, keys }: PushSubscription): Promise<void> {
    // O mesmo navegador pode ter trocado de conta: o endpoint passa para quem pediu agora.
    await this.db
      .insert(pushSubscriptions)
      .values({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { userId, p256dh: keys.p256dh, auth: keys.auth },
      })
  }

  async delete(userId: string, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)))
  }

  async deleteEndpoint(endpoint: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint))
  }

  async listForUser(userId: string): Promise<PushSubscription[]> {
    const rows = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
    return rows.map((row) => ({
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }))
  }

  async usersWithSubscriptions(): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions)
    return rows.map((row) => row.userId)
  }

  async seen(userId: string): Promise<Set<string> | null> {
    const [row] = await this.db.select().from(pushSeen).where(eq(pushSeen.userId, userId))
    return row ? new Set(row.keys) : null
  }

  async saveSeen(userId: string, keys: string[], now: Date): Promise<void> {
    await this.db
      .insert(pushSeen)
      .values({ userId, keys, updatedAt: now })
      .onConflictDoUpdate({ target: pushSeen.userId, set: { keys, updatedAt: now } })
  }
}
