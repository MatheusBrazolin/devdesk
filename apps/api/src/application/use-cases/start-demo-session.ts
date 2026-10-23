import { forbidden } from '../../domain/errors.js'
import type { UserRepository } from '../ports/user-repository.js'
import type { CreateSession, CreatedSession } from './create-session.js'

export class StartDemoSession {
  constructor(
    private readonly enabled: boolean,
    private readonly users: UserRepository,
    private readonly createSession: CreateSession,
  ) {}

  async execute(): Promise<CreatedSession> {
    if (!this.enabled) throw forbidden('O modo demonstração está desligado.')
    const user = await this.users.findOrCreateDemo()
    return this.createSession.execute(user.id)
  }
}
