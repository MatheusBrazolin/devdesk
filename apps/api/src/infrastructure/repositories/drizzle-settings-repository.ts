import { eq } from 'drizzle-orm'
import type { SettingsRepository } from '../../application/ports/settings-repository.js'
import type { Database } from '../db/client.js'
import { userSettings } from '../db/schema.js'

export class DrizzleSettingsRepository implements SettingsRepository {
  constructor(private readonly db: Database) {}

  async get(userId: string): Promise<unknown> {
    const [row] = await this.db.select().from(userSettings).where(eq(userSettings.userId, userId))
    return row?.data ?? null
  }

  async save(userId: string, data: unknown, now: Date): Promise<void> {
    await this.db
      .insert(userSettings)
      .values({ userId, data, updatedAt: now })
      .onConflictDoUpdate({ target: userSettings.userId, set: { data, updatedAt: now } })
  }
}
