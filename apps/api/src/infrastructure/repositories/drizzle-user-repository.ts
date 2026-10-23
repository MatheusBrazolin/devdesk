import { eq } from 'drizzle-orm'
import type { GitHubProfile, UserRepository } from '../../application/ports/user-repository.js'
import type { User } from '../../domain/user.js'
import type { Database } from '../db/client.js'
import { users } from '../db/schema.js'

type UserRow = typeof users.$inferSelect

const toDomain = ({ accessTokenEncrypted: _token, ...row }: UserRow): User => row

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return row ? toDomain(row) : null
  }

  async upsertFromGitHub(profile: GitHubProfile, encryptedAccessToken: string): Promise<User> {
    const values = { ...profile, accessTokenEncrypted: encryptedAccessToken }
    const [row] = await this.db
      .insert(users)
      .values(values)
      .onConflictDoUpdate({ target: users.githubId, set: { ...values, updatedAt: new Date() } })
      .returning()
    if (!row) throw new Error('upsert de usuário não retornou linha')
    return toDomain(row)
  }

  async findOrCreateDemo(): Promise<User> {
    const [existing] = await this.db.select().from(users).where(eq(users.isDemo, true)).limit(1)
    if (existing) return toDomain(existing)

    const [created] = await this.db
      .insert(users)
      .values({ login: 'demo', name: 'Visitante', isDemo: true })
      .returning()
    if (!created) throw new Error('criação do usuário demo não retornou linha')
    return toDomain(created)
  }
}
