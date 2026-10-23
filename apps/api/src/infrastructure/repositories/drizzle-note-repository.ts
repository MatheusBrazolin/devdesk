import { and, arrayContains, desc, eq, ilike, or, sql } from 'drizzle-orm'
import type {
  NoteChanges,
  NoteFilter,
  NoteRepository,
} from '../../application/ports/note-repository.js'
import type { Note } from '../../domain/note.js'
import type { Database } from '../db/client.js'
import { notes } from '../db/schema.js'

/** Escapa % e _ para a busca tratar o texto literalmente. */
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`

export class DrizzleNoteRepository implements NoteRepository {
  constructor(private readonly db: Database) {}

  async list(userId: string, filter: NoteFilter): Promise<Note[]> {
    const conditions = [eq(notes.userId, userId)]
    if (filter.q) {
      conditions.push(
        or(ilike(notes.title, likePattern(filter.q)), ilike(notes.body, likePattern(filter.q)))!,
      )
    }
    if (filter.tag) conditions.push(arrayContains(notes.tags, [filter.tag]))
    if (filter.linkUrl) {
      conditions.push(sql`${notes.links} @> ${JSON.stringify([{ url: filter.linkUrl }])}::jsonb`)
    }
    return this.db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.pinned), desc(notes.updatedAt))
      .limit(500)
  }

  async findById(userId: string, id: string): Promise<Note | null> {
    const [row] = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1)
    return row ?? null
  }

  async create(note: Omit<Note, 'id'>): Promise<Note> {
    const [row] = await this.db.insert(notes).values(note).returning()
    if (!row) throw new Error('insert de nota não retornou linha')
    return row
  }

  async update(
    userId: string,
    id: string,
    changes: NoteChanges,
    updatedAt: Date,
  ): Promise<Note | null> {
    const [row] = await this.db
      .update(notes)
      .set({ ...changes, updatedAt })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning()
    return row ?? null
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning({ id: notes.id })
    return rows.length > 0
  }

  async tagCounts(userId: string): Promise<{ tag: string; count: number }[]> {
    const rows = await this.db.execute<{ tag: string; count: number }>(sql`
      select tag, count(*)::int as count
      from ${notes}, unnest(${notes.tags}) as tag
      where ${notes.userId} = ${userId}
      group by tag
      order by count desc, tag asc
    `)
    return [...rows]
  }
}
