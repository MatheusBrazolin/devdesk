import type { createEventInputSchema } from '@devdesk/shared'
import type { z } from 'zod'
import {
  addDays,
  assertValidTiming,
  type CalendarEvent,
  type EventTiming,
} from '../../domain/calendar-event.js'
import { type Deadline, milestoneDeadlines } from '../../domain/deadlines.js'
import { AppError } from '../../domain/errors.js'
import type { User } from '../../domain/user.js'
import type { EventContent, EventRepository } from '../ports/event-repository.js'
import type { Clock } from '../ports/security.js'
import type { GetDashboard } from './get-dashboard.js'

export type EventInput = z.output<typeof createEventInputSchema>

export interface DeadlinesInRange {
  deadlines: Deadline[]
  /** Falso quando o GitHub não respondeu: o calendário segue com os eventos. */
  available: boolean
}

const notFound = () => new AppError('NOT_FOUND', 'Evento não encontrado.')

function toContent(input: EventInput): EventContent {
  const timing: EventTiming = input.allDay
    ? {
        allDay: true,
        date: input.date,
        endDate: input.endDate === input.date ? null : input.endDate,
      }
    : {
        allDay: false,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      }
  assertValidTiming(timing)
  return {
    title: input.title,
    description: input.description,
    kind: input.kind,
    link: input.link,
    ...timing,
  }
}

export class Calendar {
  constructor(
    private readonly repository: EventRepository,
    private readonly dashboard: GetDashboard,
    private readonly clock: Clock,
  ) {}

  events(user: User, from: string, to: string): Promise<CalendarEvent[]> {
    return this.repository.listBetween(user.id, from, to)
  }

  async deadlinesBetween(user: User, from: string, to: string): Promise<DeadlinesInRange> {
    const deadlines = await this.deadlines(user)
    return {
      deadlines: deadlines?.filter((d) => d.date >= from && d.date <= to) ?? [],
      available: deadlines !== null,
    }
  }

  /** Tudo o que vai para o .ics: de 90 dias atrás até um ano à frente. */
  async feed(user: User): Promise<{ events: CalendarEvent[]; deadlines: Deadline[] }> {
    const today = this.clock.now().toISOString().slice(0, 10)
    const [from, to] = [addDays(today, -90), addDays(today, 365)]
    const [events, { deadlines }] = await Promise.all([
      this.events(user, from, to),
      this.deadlinesBetween(user, from, to),
    ])
    return { events, deadlines }
  }

  async get(userId: string, id: string): Promise<CalendarEvent> {
    const event = await this.repository.findById(userId, id)
    if (!event) throw notFound()
    return event
  }

  create(userId: string, input: EventInput): Promise<CalendarEvent> {
    const now = this.clock.now()
    return this.repository.create({ ...toContent(input), userId, createdAt: now, updatedAt: now })
  }

  async replace(userId: string, id: string, input: EventInput): Promise<CalendarEvent> {
    const event = await this.repository.replace(userId, id, toContent(input), this.clock.now())
    if (!event) throw notFound()
    return event
  }

  async delete(userId: string, id: string): Promise<void> {
    if (!(await this.repository.delete(userId, id))) throw notFound()
  }

  /** Nulo se o GitHub falhar: um prazo que não carregou não derruba o calendário. */
  private async deadlines(user: User): Promise<Deadline[] | null> {
    try {
      const { snapshot } = await this.dashboard.execute(user)
      return milestoneDeadlines(snapshot)
    } catch {
      return null
    }
  }
}
