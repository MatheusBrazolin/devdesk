import { randomUUID } from 'node:crypto'
import type { SessionRepository } from '../../application/ports/session-repository.js'
import type { GitHubProfile, UserRepository } from '../../application/ports/user-repository.js'
import type { Session } from '../../domain/session.js'
import type { User } from '../../domain/user.js'

/** Implementações em memória das portas. Usadas nos testes. */
export class InMemoryUserRepository implements UserRepository {
  readonly items = new Map<string, User>()
  readonly tokens = new Map<string, string>()

  async findById(id: string): Promise<User | null> {
    return this.items.get(id) ?? null
  }

  async upsertFromGitHub(profile: GitHubProfile, encryptedAccessToken: string): Promise<User> {
    const existing = [...this.items.values()].find((u) => u.githubId === profile.githubId)
    const now = new Date()
    const user: User = existing
      ? { ...existing, ...profile, updatedAt: now }
      : { id: randomUUID(), ...profile, isDemo: false, createdAt: now, updatedAt: now }
    this.items.set(user.id, user)
    this.tokens.set(user.id, encryptedAccessToken)
    return user
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
