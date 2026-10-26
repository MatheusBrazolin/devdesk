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
import type { PushRepository } from '../../application/ports/push.js'
import type { SessionRepository } from '../../application/ports/session-repository.js'
import type { SettingsRepository } from '../../application/ports/settings-repository.js'
import type {
  NewSubscription,
  SubscriptionRepository,
  SubscriptionWithUrl,
} from '../../application/ports/subscription-repository.js'
import type {
  EncryptedGitHubTokens,
  GitHubProfile,
  UserRepository,
} from '../../application/ports/user-repository.js'
import { addDays, type CalendarEvent } from '../../domain/calendar-event.js'
import type { CalendarSubscription } from '../../domain/external-calendar.js'
import type { Note } from '../../domain/note.js'
import type { PushSubscription } from '../../domain/push.js'
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

  async deleteDemosCreatedBefore(date: Date): Promise<number> {
    const old = [...this.items.values()].filter((u) => u.isDemo && u.createdAt < date)
    old.forEach((u) => this.items.delete(u.id))
    return old.length
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id)
    this.tokens.delete(id)
  }

  async createDemo(now: Date): Promise<User> {
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

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  readonly items: SubscriptionWithUrl[] = []

  async list(userId: string): Promise<CalendarSubscription[]> {
    return (await this.listWithUrls(userId)).map((item) => item.subscription)
  }

  async listWithUrls(userId: string): Promise<SubscriptionWithUrl[]> {
    return this.items.filter((item) => item.subscription.userId === userId)
  }

  async create({ urlEncrypted, ...data }: NewSubscription): Promise<CalendarSubscription> {
    const subscription = { id: randomUUID(), ...data }
    this.items.push({ subscription, urlEncrypted })
    return subscription
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const index = this.items.findIndex(
      (item) => item.subscription.userId === userId && item.subscription.id === id,
    )
    if (index < 0) return false
    this.items.splice(index, 1)
    return true
  }
}

export class InMemoryPushRepository implements PushRepository {
  readonly subscriptions = new Map<string, { userId: string; subscription: PushSubscription }>()
  readonly seenKeys = new Map<string, string[]>()

  async save(userId: string, subscription: PushSubscription): Promise<void> {
    this.subscriptions.set(subscription.endpoint, { userId, subscription })
  }

  async delete(userId: string, endpoint: string): Promise<void> {
    if (this.subscriptions.get(endpoint)?.userId === userId) this.subscriptions.delete(endpoint)
  }

  async deleteEndpoint(endpoint: string): Promise<void> {
    this.subscriptions.delete(endpoint)
  }

  async listForUser(userId: string): Promise<PushSubscription[]> {
    return [...this.subscriptions.values()]
      .filter((item) => item.userId === userId)
      .map((item) => item.subscription)
  }

  async usersWithSubscriptions(): Promise<string[]> {
    return [...new Set([...this.subscriptions.values()].map((item) => item.userId))]
  }

  async seen(userId: string): Promise<Set<string> | null> {
    const keys = this.seenKeys.get(userId)
    return keys ? new Set(keys) : null
  }

  async saveSeen(userId: string, keys: string[]): Promise<void> {
    this.seenKeys.set(userId, keys)
  }
}

export class InMemorySettingsRepository implements SettingsRepository {
  readonly items = new Map<string, unknown>()

  async get(userId: string): Promise<unknown> {
    return this.items.get(userId) ?? null
  }

  async save(userId: string, data: unknown): Promise<void> {
    this.items.set(userId, data)
  }
}

const sortKey = (event: CalendarEvent) =>
  event.allDay ? Date.parse(`${event.date}T00:00:00Z`) : event.startsAt.getTime()
