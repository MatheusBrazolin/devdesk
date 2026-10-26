import { type Settings, type SettingsInput, settingsSchema } from '@devdesk/shared'
import type { User } from '../../domain/user.js'
import type { SettingsRepository } from '../ports/settings-repository.js'
import type { Clock } from '../ports/security.js'

/** Configurações da pessoa: quais avisos receber e quais repositórios formam o time. */
export class UserSettings {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly clock: Clock,
  ) {}

  /** Sempre completo: o que falta ou não vale mais volta ao padrão. */
  async get(userId: string): Promise<Settings> {
    const parsed = settingsSchema.safeParse((await this.repository.get(userId)) ?? {})
    return parsed.success ? parsed.data : settingsSchema.parse({})
  }

  async update(user: User, input: SettingsInput): Promise<Settings> {
    const settings = settingsSchema.parse(input)
    // Repetido ou vazio não muda o time: lista vazia vira "escolher sozinho".
    const repositories = settings.teamRepositories && [...new Set(settings.teamRepositories)]
    const normalized = {
      ...settings,
      teamRepositories: repositories && repositories.length > 0 ? repositories : null,
    }
    await this.repository.save(user.id, normalized, this.clock.now())
    return normalized
  }
}
