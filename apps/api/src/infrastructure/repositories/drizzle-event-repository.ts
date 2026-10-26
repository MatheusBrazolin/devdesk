import { and, eq, isNotNull, lte, or, sql } from 'drizzle-orm'
import type {
  EventContent,
  EventRepository,
  NewEvent,
} from '../../application/ports/event-repository.js'
import { addDays, type CalendarEvent } from '../../domain/calendar-event.js'
import type { Database } from '../db/client.js'
import { calendarEvents } from '../db/schema.js'

type Row = typeof calendarEvents.$inferSelect

function toDomain(row: Row): CalendarEvent {
  const base = {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    kind: row.kind,
    link: row.link ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
  return row.allDay
    ? { ...base, allDay: true, date: row.date!, endDate: row.endDate }
    : { ...base, allDay: false, startsAt: row.startsAt!, endsAt: row.endsAt }
}

function toColumns(content: EventContent) {
  const common = {
    title: content.title,
    description: content.description,
    kind: content.kind,
    link: content.link,
  }
  return content.allDay
    ? {
        ...common,
        allDay: true,
        date: content.date,
        endDate: content.endDate,
        startsAt: null,
        endsAt: null,
      }
    : {
        ...common,
        allDay: false,
        date: null,
        endDate: null,
        startsAt: content.startsAt,
        endsAt: content.endsAt,
      }
}

export class DrizzleEventRepository implements EventRepository {
  constructor(private readonly db: Database) {}

  async listAll(userId: string): Promise<CalendarEvent[]> {
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(calendarEvents.createdAt)
    return rows.map(toDomain)
  }

  async listBetween(userId: string, from: string, to: string): Promise<CalendarEvent[]> {
    // Folga de um dia para os eventos com horário: o dia local depende do fuso.
    const after = new Date(`${addDays(from, -1)}T00:00:00Z`)
    const before = new Date(`${addDays(to, 2)}T00:00:00Z`)
    const rows = await this.db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          or(
            and(
              isNotNull(calendarEvents.date),
              lte(calendarEvents.date, to),
              sql`coalesce(${calendarEvents.endDate}, ${calendarEvents.date}) >= ${from}::date`,
            ),
            and(
              isNotNull(calendarEvents.startsAt),
              lte(calendarEvents.startsAt, before),
              // Em SQL escrito à mão o driver não converte Date: vai como ISO, com cast.
              sql`coalesce(${calendarEvents.endsAt}, ${calendarEvents.startsAt}) >= ${after.toISOString()}::timestamptz`,
            ),
          ),
        ),
      )
      .orderBy(
        sql`coalesce(${calendarEvents.date}::timestamptz, ${calendarEvents.startsAt})`,
        calendarEvents.title,
      )
    return rows.map(toDomain)
  }

  async findById(userId: string, id: string): Promise<CalendarEvent | null> {
    const [row] = await this.db
      .select()
      .from(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .limit(1)
    return row ? toDomain(row) : null
  }

  async create(event: NewEvent): Promise<CalendarEvent> {
    const [row] = await this.db
      .insert(calendarEvents)
      .values({
        ...toColumns(event),
        userId: event.userId,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
      })
      .returning()
    if (!row) throw new Error('insert de evento não retornou linha')
    return toDomain(row)
  }

  async replace(
    userId: string,
    id: string,
    content: EventContent,
    updatedAt: Date,
  ): Promise<CalendarEvent | null> {
    const [row] = await this.db
      .update(calendarEvents)
      .set({ ...toColumns(content), updatedAt })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning()
    return row ? toDomain(row) : null
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning({ id: calendarEvents.id })
    return rows.length > 0
  }
}
