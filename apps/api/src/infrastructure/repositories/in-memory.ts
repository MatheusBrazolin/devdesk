import { randomUUID } from 'node:crypto'
import type {
  EventContent,
  EventRepository,
  NewEvent,
} from '../../application/ports/event-repository.js'
import type {
  NoteChanges,
  NoteFilter,
  NoteRepository,
} from '../../application/ports/note-repository.js'
import type { SessionRepository } from '../../application/ports/session-repository.js'
import type {
  EncryptedGitHubTokens,
  GitHubProfile,
  UserRepository,
} from '../../application/ports/user-repository.js'
import { addDays, type CalendarEvent } from '../../domain/calendar-event.js'
import type { Note } from '../../domain/note.js'
import type { Session } from '../../domain/session.js'
import type { User } from '../../domain/user.js'

/** Implementações em memória das portas. Usadas nos testes. */
export class InMemoryUserRepository implements UserRepository {
  readonly items = new Map<string, User>()
  readonly tokens = new Map<string, EncryptedGitHubTokens>()

  async findById(id: string): Promise<User | null> {
    return this.items.get(id) ?? null
  }

  async upsertFromGitHub(profile: GitHubProfile): Promise<User> {
    const existing = [...this.items.values()].find((u) => u.githubId === profile.githubId)
    const now = new Date()
    const user: User = existing
      ? { ...existing, ...profile, updatedAt: now }
      : { id: randomUUID(), ...profile, isDemo: false, createdAt: now, updatedAt: now }
    this.items.set(user.id, user)
    return user
  }

  async findGitHubTokens(userId: string): Promise<EncryptedGitHubTokens | null> {
    return this.tokens.get(userId) ?? null
  }

  async saveGitHubTokens(userId: string, tokens: EncryptedGitHubTokens): Promise<void> {
    this.tokens.set(userId, tokens)
  }

  async findOrCreateDemo(): Promise<User> {
    const existing = [...this.items.values()].find((u) => u.isDemo)
    if (existing) return existing
    const now = new Date()
    const user: User = {
      id: randomUUID(),
      githubId: null,
      login: 'demo',
      name: 'Visitante',
      avatarUrl: null,
      isDemo: true,
      createdAt: now,
      updatedAt: now,
    }
    this.items.set(user.id, user)
    return user
  }
}

export class InMemorySessionRepository implements SessionRepository {
  readonly items = new Map<string, Session>()

  async create(session: Session): Promise<void> {
    this.items.set(session.id, session)
  }

  async findById(id: string): Promise<Session | null> {
    return this.items.get(id) ?? null
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id)
  }
}

export class InMemoryNoteRepository implements NoteRepository {
  readonly items = new Map<string, Note>()

  async list(userId: string, filter: NoteFilter): Promise<Note[]> {
    const q = filter.q?.toLowerCase()
    return [...this.items.values()]
      .filter((note) => note.userId === userId)
      .filter((note) => !q || `${note.title}\n${note.body}`.toLowerCase().includes(q))
      .filter((note) => !filter.tag || note.tags.includes(filter.tag))
      .filter((note) => !filter.linkUrl || note.links.some((link) => link.url === filter.linkUrl))
      .sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) || b.updatedAt.getTime() - a.updatedAt.getTime(),
      )
  }

  async findById(userId: string, id: string): Promise<Note | null> {
    const note = this.items.get(id)
    return note?.userId === userId ? note : null
  }

  async create(note: Omit<Note, 'id'>): Promise<Note> {
    const created = { ...note, id: randomUUID() }
    this.items.set(created.id, created)
    return created
  }

  async update(
    userId: string,
    id: string,
    changes: NoteChanges,
    updatedAt: Date,
  ): Promise<Note | null> {
    const note = await this.findById(userId, id)
    if (!note) return null
    const updated = { ...note, ...changes, updatedAt }
    this.items.set(id, updated)
    return updated
  }

  async delete(userId: string, id: string): Promise<boolean> {
    if (!(await this.findById(userId, id))) return false
    return this.items.delete(id)
  }

  async tagCounts(userId: string): Promise<{ tag: string; count: number }[]> {
    const counts = new Map<string, number>()
    for (const note of this.items.values()) {
      if (note.userId !== userId) continue
      for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  }
}

export class InMemoryEventRepository implements EventRepository {
  readonly items = new Map<string, CalendarEvent>()

  async listBetween(userId: string, from: string, to: string): Promise<CalendarEvent[]> {
    const after = Date.parse(`${addDays(from, -1)}T00:00:00Z`)
    const before = Date.parse(`${addDays(to, 2)}T00:00:00Z`)
    return [...this.items.values()]
      .filter((event) => event.userId === userId)
      .filter((event) =>
        event.allDay
          ? event.date <= to && (event.endDate ?? event.date) >= from
          : event.startsAt.getTime() <= before &&
            (event.endsAt ?? event.startsAt).getTime() >= after,
      )
      .sort((a, b) => sortKey(a) - sortKey(b) || a.title.localeCompare(b.title))
  }

  async findById(userId: string, id: string): Promise<CalendarEvent | null> {
    const event = this.items.get(id)
    return event?.userId === userId ? event : null
  }

  async create(event: NewEvent): Promise<CalendarEvent> {
    const created = { ...event, id: randomUUID() } as CalendarEvent
    this.items.set(created.id, created)
    return created
  }

  async replace(
    userId: string,
    id: string,
    content: EventContent,
    updatedAt: Date,
  ): Promise<CalendarEvent | null> {
    const event = await this.findById(userId, id)
    if (!event) return null
    const { id: _id, userId: owner, createdAt } = event
    const replaced = { ...content, id, userId: owner, createdAt, updatedAt } as CalendarEvent
    this.items.set(id, replaced)
    return replaced
  }

  async delete(userId: string, id: string): Promise<boolean> {
    if (!(await this.findById(userId, id))) return false
    return this.items.delete(id)
  }
}

const sortKey = (event: CalendarEvent) =>
  event.allDay ? Date.parse(`${event.date}T00:00:00Z`) : event.startsAt.getTime()
