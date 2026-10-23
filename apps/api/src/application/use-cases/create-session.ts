import { SESSION_TTL_MS } from '../../domain/session.js'
import type { Clock, SessionTokens } from '../ports/security.js'
import type { SessionRepository } from '../ports/session-repository.js'

export interface CreatedSession {
  token: string
  expiresAt: Date
}

export class CreateSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokens,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<CreatedSession> {
    const now = this.clock.now()
    const token = this.tokens.generate()
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    await this.sessions.create({ id: this.tokens.hash(token), userId, expiresAt, createdAt: now })
    return { token, expiresAt }
  }
}
