import { forbidden } from '../../domain/errors.js'
import type { Clock } from '../ports/security.js'
import type { UserRepository } from '../ports/user-repository.js'
import type { CreateSession, CreatedSession } from './create-session.js'

/** Quanto vive uma visita de demonstração, com tudo o que ela criou. */
export const DEMO_TTL_MS = 24 * 60 * 60 * 1000

export class StartDemoSession {
  constructor(
    private readonly enabled: boolean,
    private readonly users: UserRepository,
    private readonly createSession: CreateSession,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<CreatedSession> {
    if (!this.enabled) throw forbidden('O modo demonstração está desligado.')
    const now = this.clock.now()
    // A limpeza das visitas antigas vem de carona; se falhar, a nova entra mesmo assim.
    await this.users.deleteDemosCreatedBefore(new Date(now.getTime() - DEMO_TTL_MS)).catch(() => 0)
    const user = await this.users.createDemo(now)
    return this.createSession.execute(user.id)
  }
}
