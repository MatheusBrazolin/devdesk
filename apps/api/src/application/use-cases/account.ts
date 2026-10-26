import type { Settings } from '@devdesk/shared'
import type { CalendarEvent } from '../../domain/calendar-event.js'
import { AppError } from '../../domain/errors.js'
import type { CalendarSubscription } from '../../domain/external-calendar.js'
import type { Note } from '../../domain/note.js'
import type { User } from '../../domain/user.js'
import type { EventRepository } from '../ports/event-repository.js'
import type { NoteRepository } from '../ports/note-repository.js'
import type { Clock } from '../ports/security.js'
import type { UserRepository } from '../ports/user-repository.js'
import type { ExternalCalendars } from './external-calendars.js'
import type { UserSettings } from './user-settings.js'

export interface AccountData {
  exportedAt: Date
  user: User
  settings: Settings
  notes: Note[]
  events: CalendarEvent[]
  subscriptions: CalendarSubscription[]
}

/**
 * Os direitos da pessoa sobre os próprios dados (LGPD): levar tudo num
 * arquivo e apagar a conta de vez, com tudo o que é dela.
 */
export class Account {
  constructor(
    private readonly users: UserRepository,
    private readonly notes: NoteRepository,
    private readonly events: EventRepository,
    private readonly externalCalendars: ExternalCalendars,
    private readonly settings: UserSettings,
    private readonly clock: Clock,
  ) {}

  async export(user: User): Promise<AccountData> {
    const [settings, notes, events, subscriptions] = await Promise.all([
      this.settings.get(user.id),
      this.notes.list(user.id, {}),
      this.events.listBetween(user.id, '1970-01-01', '9999-12-30'),
      this.externalCalendars.list(user),
    ])
    return { exportedAt: this.clock.now(), user, settings, notes, events, subscriptions }
  }

  /** Pede o login digitado de novo: um clique sem querer não apaga ninguém. */
  async delete(user: User, confirmation: string): Promise<void> {
    if (confirmation.trim().toLowerCase() !== user.login.toLowerCase()) {
      throw new AppError('VALIDATION', 'Digite o seu login para confirmar.')
    }
    await this.externalCalendars.forget(user)
    // Sessões, token do GitHub, notas, eventos, agendas, avisos e configurações vão em cascata.
    await this.users.delete(user.id)
  }
}
