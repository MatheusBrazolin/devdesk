import { eq } from 'drizzle-orm'
import type {
  EncryptedGitHubTokens,
  GitHubProfile,
  UserRepository,
} from '../../application/ports/user-repository.js'
import type { User } from '../../domain/user.js'
import type { Database } from '../db/client.js'
import { users } from '../db/schema.js'

type UserRow = typeof users.$inferSelect

const toDomain = ({
  accessTokenEncrypted: _access,
  accessTokenExpiresAt: _accessExpiry,
  refreshTokenEncrypted: _refresh,
  refreshTokenExpiresAt: _refreshExpiry,
  ...row
}: UserRow): User => row

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id)).limit(1)
    return row ? toDomain(row) : null
  }

  async upsertFromGitHub(profile: GitHubProfile): Promise<User> {
    const [row] = await this.db
      .insert(users)
      .values(profile)
      .onConflictDoUpdate({ target: users.githubId, set: { ...profile, updatedAt: new Date() } })
      .returning()
    if (!row) throw new Error('upsert de usuário não retornou linha')
    return toDomain(row)
  }

  async findGitHubTokens(userId: string): Promise<EncryptedGitHubTokens | null> {
    const [row] = await this.db
      .select({
        accessToken: users.accessTokenEncrypted,
        accessTokenExpiresAt: users.accessTokenExpiresAt,
        refreshToken: users.refreshTokenEncrypted,
        refreshTokenExpiresAt: users.refreshTokenExpiresAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    if (!row?.accessToken) return null
    return { ...row, accessToken: row.accessToken }
  }

  async saveGitHubTokens(userId: string, tokens: EncryptedGitHubTokens): Promise<void> {
    await this.db
      .update(users)
      .set({
        accessTokenEncrypted: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
        refreshTokenEncrypted: tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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
