import type { SessionTokens } from '../ports/security.js'
import type { SessionRepository } from '../ports/session-repository.js'

export class Logout {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tokens: SessionTokens,
  ) {}

  async execute(token: string | undefined): Promise<void> {
    if (!token) return
    await this.sessions.delete(this.tokens.hash(token))
  }
}
