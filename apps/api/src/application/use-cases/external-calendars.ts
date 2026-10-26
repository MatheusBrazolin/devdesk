import type { createSubscriptionInputSchema } from '@devdesk/shared'
import type { z } from 'zod'
import { addDays } from '../../domain/calendar-event.js'
import { AppError, forbidden } from '../../domain/errors.js'
import {
  type CalendarSubscription,
  type ExternalCalendarEvents,
  type ExternalOccurrence,
  MAX_SUBSCRIPTIONS,
  parseCalendarUrl,
} from '../../domain/external-calendar.js'
import type { User } from '../../domain/user.js'
import type { IcsFetcher } from '../ports/ics-fetcher.js'
import type { Clock, TokenCipher } from '../ports/security.js'
import type { SubscriptionRepository } from '../ports/subscription-repository.js'

export type SubscriptionInput = z.output<typeof createSubscriptionInputSchema>

/** Lê o texto do .ics e expande as ocorrências do intervalo. */
export type IcsExpander = (source: string, from: Date, to: Date) => ExternalOccurrence[]

export interface ExternalEventsInRange {
  calendars: ExternalCalendarEvents[]
  /** Nomes das agendas que não responderam agora. */
  unavailable: string[]
}

/** Agenda baixada há menos disso é reaproveitada: o Google mesmo só atualiza a cada poucas horas. */
export const FEED_TTL_MS = 15 * 60 * 1000

const notFound = () => new AppError('NOT_FOUND', 'Agenda não encontrada.')

interface SampleCalendar {
  id: string
  name: string
  ics: string
}

/**
 * Agendas externas (Google, Outlook, iCloud) assinadas pelo link .ics.
 * Só leitura: o DevDesk baixa o arquivo e mostra; nunca escreve na agenda.
 */
export class ExternalCalendars {
  private readonly feeds = new Map<string, { text: string; fetchedAt: number }>()

  constructor(
    private readonly repository: SubscriptionRepository,
    private readonly cipher: TokenCipher,
    private readonly fetcher: IcsFetcher,
    private readonly expand: IcsExpander,
    private readonly sample: SampleCalendar,
    private readonly clock: Clock,
  ) {}

  async list(user: User): Promise<CalendarSubscription[]> {
    if (user.isDemo) {
      return [{ ...this.sample, userId: user.id, host: 'exemplo', createdAt: user.createdAt }]
    }
    return this.repository.list(user.id)
  }

  async add(user: User, input: SubscriptionInput): Promise<CalendarSubscription> {
    if (user.isDemo) throw forbidden('No modo demonstração a agenda de exemplo já vem conectada.')
    const url = parseCalendarUrl(input.url)
    if ((await this.repository.list(user.id)).length >= MAX_SUBSCRIPTIONS) {
      throw new AppError('VALIDATION', `Dá para assinar até ${MAX_SUBSCRIPTIONS} agendas.`)
    }

    // Lê uma vez antes de guardar: um link errado é avisado agora, não some calado depois.
    let text: string
    try {
      text = await this.fetcher.fetch(url)
      const now = this.clock.now()
      this.expand(text, now, now)
    } catch (cause) {
      throw new AppError(
        'VALIDATION',
        'Não consegui ler essa agenda. Confira se é o endereço secreto no formato iCal (.ics).',
        { cause },
      )
    }

    const subscription = await this.repository.create({
      userId: user.id,
      name: input.name,
      host: url.hostname,
      urlEncrypted: this.cipher.encrypt(url.href),
      createdAt: this.clock.now(),
    })
    this.feeds.set(subscription.id, { text, fetchedAt: this.clock.now().getTime() })
    return subscription
  }

  async remove(user: User, id: string): Promise<void> {
    if (user.isDemo) throw forbidden('A agenda de exemplo não pode ser removida.')
    if (!(await this.repository.delete(user.id, id))) throw notFound()
    this.feeds.delete(id)
  }

  /** Esquece as agendas baixadas da pessoa (a conta vai ser apagada). */
  async forget(user: User): Promise<void> {
    for (const subscription of await this.repository.list(user.id))
      this.feeds.delete(subscription.id)
  }

  /** Ocorrências que tocam as datas [from, to], com um dia de folga de cada lado por causa do fuso. */
  async between(user: User, from: string, to: string): Promise<ExternalEventsInRange> {
    const start = new Date(`${addDays(from, -1)}T00:00:00Z`)
    const end = new Date(`${addDays(to, 2)}T00:00:00Z`)

    if (user.isDemo) {
      const events = this.expand(this.sample.ics, start, end)
      return {
        calendars: [{ calendarId: this.sample.id, calendar: this.sample.name, events }],
        unavailable: [],
      }
    }

    const subscriptions = await this.repository.listWithUrls(user.id)
    const results = await Promise.all(
      subscriptions.map(async ({ subscription, urlEncrypted }) => {
        try {
          const text = await this.feed(subscription.id, urlEncrypted)
          return {
            calendarId: subscription.id,
            calendar: subscription.name,
            events: this.expand(text, start, end),
          }
        } catch {
          return subscription.name
        }
      }),
    )
    return {
      calendars: results.filter((r): r is ExternalCalendarEvents => typeof r !== 'string'),
      unavailable: results.filter((r): r is string => typeof r === 'string'),
    }
  }

  /** Texto da agenda, do cache se estiver fresco. Se o provedor falhar, serve o último que deu certo. */
  private async feed(id: string, urlEncrypted: string): Promise<string> {
    const now = this.clock.now().getTime()
    const cached = this.feeds.get(id)
    if (cached && now - cached.fetchedAt < FEED_TTL_MS) return cached.text
    try {
      const text = await this.fetcher.fetch(new URL(this.cipher.decrypt(urlEncrypted)))
      this.feeds.set(id, { text, fetchedAt: now })
      return text
    } catch (error) {
      if (cached) return cached.text
      throw error
    }
  }
}
