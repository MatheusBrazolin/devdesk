import { unauthenticated } from '../../domain/errors.js'
import { isSessionExpired } from '../../domain/session.js'
import type { User } from '../../domain/user.js'
import type { Clock, SessionTokens } from '../ports/security.js'
import type { SessionRepository } from '../ports/session-repository.js'
import type { UserRepository } from '../ports/user-repository.js'

export class GetCurrentUser {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly users: UserRepository,
    private readonly tokens: SessionTokens,
    private readonly clock: Clock,
  ) {}

  async execute(token: string | undefined): Promise<User> {
    if (!token) throw unauthenticated()

    const session = await this.sessions.findById(this.tokens.hash(token))
    if (!session) throw unauthenticated()

    if (isSessionExpired(session, this.clock.now())) {
      await this.sessions.delete(session.id)
      throw unauthenticated()
    }

    const user = await this.users.findById(session.userId)
    if (!user) throw unauthenticated()
    return user
  }
}
