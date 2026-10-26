import { addDays } from '../../domain/calendar-event.js'
import { AppError, forbidden } from '../../domain/errors.js'
import {
  isAllowedPushEndpoint,
  type PushSubscription,
  pushRound,
  type UpcomingEvent,
} from '../../domain/push.js'
import type { User } from '../../domain/user.js'
import type { PushRepository, PushSender } from '../ports/push.js'
import type { Clock } from '../ports/security.js'
import type { UserRepository } from '../ports/user-repository.js'
import type { Calendar } from './calendar.js'
import type { ExternalCalendars } from './external-calendars.js'
import type { GetDashboard } from './get-dashboard.js'
import type { UserSettings } from './user-settings.js'

export interface PushRunResult {
  users: number
  sent: number
}

/**
 * Avisos com o app fechado. Um agendador externo (GitHub Actions, de graça)
 * chama a rodada a cada 10 minutos; ela olha o painel e a agenda de quem
 * pediu e manda só o que é novo. Também acorda o servidor, que dorme no plano grátis.
 */
export class PushNotifications {
  constructor(
    private readonly repository: PushRepository,
    private readonly sender: PushSender,
    private readonly users: UserRepository,
    private readonly dashboard: GetDashboard,
    private readonly calendar: Calendar,
    private readonly externalCalendars: ExternalCalendars,
    private readonly settings: UserSettings,
    private readonly webOrigin: string,
    private readonly clock: Clock,
  ) {}

  get publicKey(): string {
    return this.sender.publicKey
  }

  async subscribe(user: User, subscription: PushSubscription): Promise<void> {
    if (user.isDemo) throw forbidden('No modo demonstração os avisos ficam só com o app aberto.')
    if (!isAllowedPushEndpoint(subscription.endpoint)) {
      throw new AppError('VALIDATION', 'Este navegador usa um serviço de push desconhecido.')
    }
    await this.repository.save(user.id, subscription)
  }

  unsubscribe(user: User, endpoint: string): Promise<void> {
    return this.repository.delete(user.id, endpoint)
  }

  async run(): Promise<PushRunResult> {
    const userIds = await this.repository.usersWithSubscriptions()
    let sent = 0
    // Uma pessoa por vez: poupa a cota do GitHub e a memória do plano grátis.
    for (const userId of userIds) {
      sent += await this.runFor(userId).catch(() => 0)
    }
    return { users: userIds.length, sent }
  }

  private async runFor(userId: string): Promise<number> {
    const user = await this.users.findById(userId)
    if (!user || user.isDemo) return 0
    const now = this.clock.now()

    const [{ attention }, events, seen, settings] = await Promise.all([
      // Sempre do GitHub: o retrato guardado pode ter até um dia, e o aviso precisa ser de agora.
      this.dashboard.execute(user, { refresh: true }),
      this.upcoming(user, now),
      this.repository.seen(userId),
      this.settings.get(userId),
    ])
    const enabled = new Set(
      Object.entries(settings.notifications)
        .filter(([, on]) => on)
        .map(([kind]) => kind),
    )
    const { keys, notices } = pushRound(seen, attention, events, now, this.webOrigin, enabled)
    await this.repository.saveSeen(userId, keys, now)
    if (notices.length === 0) return 0

    let sent = 0
    for (const subscription of await this.repository.listForUser(userId)) {
      for (const notice of notices) {
        const result = await this.sender.send(subscription, notice)
        if (result === 'gone') {
          await this.repository.deleteEndpoint(subscription.endpoint)
          break
        }
        if (result === 'sent') sent += 1
      }
    }
    return sent
  }

  /** Eventos com horário de hoje e amanhã, do DevDesk e das agendas assinadas. */
  private async upcoming(user: User, now: Date): Promise<UpcomingEvent[]> {
    const today = now.toISOString().slice(0, 10)
    const tomorrow = addDays(today, 1)
    const [own, external] = await Promise.all([
      this.calendar.events(user, today, tomorrow),
      this.externalCalendars
        .between(user, today, tomorrow)
        .catch(() => ({ calendars: [], unavailable: [] })),
    ])
    return [
      ...own.flatMap((event): UpcomingEvent[] =>
        event.allDay
          ? []
          : [{ id: event.id, title: event.title, startsAt: event.startsAt, calendar: null }],
      ),
      ...external.calendars.flatMap((calendar) =>
        calendar.events.flatMap((event): UpcomingEvent[] =>
          event.allDay
            ? []
            : [
                {
                  id: `${calendar.calendarId}:${event.id}`,
                  title: event.title,
                  startsAt: event.startsAt,
                  calendar: calendar.calendar,
                },
              ],
        ),
      ),
    ]
  }
}
