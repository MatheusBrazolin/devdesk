import { and, asc, eq } from 'drizzle-orm'
import type {
  NewSubscription,
  SubscriptionRepository,
  SubscriptionWithUrl,
} from '../../application/ports/subscription-repository.js'
import type { CalendarSubscription } from '../../domain/external-calendar.js'
import type { Database } from '../db/client.js'
import { calendarSubscriptions } from '../db/schema.js'

type Row = typeof calendarSubscriptions.$inferSelect

const toDomain = ({ urlEncrypted: _, ...row }: Row): CalendarSubscription => row

export class DrizzleSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string): Promise<CalendarSubscription[]> {
    return (await this.rows(userId)).map(toDomain)
  }

  async listWithUrls(userId: string): Promise<SubscriptionWithUrl[]> {
    return (await this.rows(userId)).map((row) => ({
      subscription: toDomain(row),
      urlEncrypted: row.urlEncrypted,
    }))
  }

  async create(subscription: NewSubscription): Promise<CalendarSubscription> {
    const [row] = await this.db.insert(calendarSubscriptions).values(subscription).returning()
    return toDomain(row!)
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(calendarSubscriptions)
      .where(and(eq(calendarSubscriptions.userId, userId), eq(calendarSubscriptions.id, id)))
      .returning({ id: calendarSubscriptions.id })
    return rows.length > 0
  }

  private rows(userId: string): Promise<Row[]> {
    return this.db
      .select()
      .from(calendarSubscriptions)
      .where(eq(calendarSubscriptions.userId, userId))
      .orderBy(asc(calendarSubscriptions.createdAt))
  }
}
