import {
  type CalendarEvent as CalendarEventDto,
  type CalendarResponse,
  type DeadlinesResponse,
  calendarRangeQuerySchema,
  createEventInputSchema,
} from '@devdesk/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AppError } from '../../domain/errors.js'
import type { AppDependencies } from '../dependencies.js'
import { buildIcs } from '../ics.js'
import { presentEvent } from '../presenters.js'
import { readSessionToken } from '../session-cookie.js'

const paramsSchema = z.object({ id: z.string() })
const uuid = z.uuid()

export async function calendarRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, calendar } = deps.useCases
  const currentUser = (request: FastifyRequest) => getCurrentUser.execute(readSessionToken(request))

  const eventId = (request: FastifyRequest) => {
    const { id } = paramsSchema.parse(request.params)
    if (!uuid.safeParse(id).success) throw new AppError('NOT_FOUND', 'Evento não encontrado.')
    return id
  }

  app.get('/calendar', async (request): Promise<CalendarResponse> => {
    const user = await currentUser(request)
    const { from, to } = calendarRangeQuerySchema.parse(request.query)
    return { events: (await calendar.events(user, from, to)).map(presentEvent) }
  })

  app.get('/calendar/deadlines', async (request): Promise<DeadlinesResponse> => {
    const user = await currentUser(request)
    const { from, to } = calendarRangeQuerySchema.parse(request.query)
    return calendar.deadlinesBetween(user, from, to)
  })

  /** Arquivo .ics para importar no Google Agenda, Apple Calendar ou Outlook. */
  app.get('/calendar.ics', async (request, reply) => {
    const user = await currentUser(request)
    const { events, deadlines } = await calendar.feed(user)
    return reply
      .header('content-type', 'text/calendar; charset=utf-8')
      .header('content-disposition', 'attachment; filename="devdesk.ics"')
      .header('cache-control', 'no-store')
      .send(buildIcs(events, deadlines, new Date()))
  })

  app.get('/calendar/events/:id', async (request): Promise<{ event: CalendarEventDto }> => {
    const user = await currentUser(request)
    return { event: presentEvent(await calendar.get(user.id, eventId(request))) }
  })

  app.post('/calendar/events', async (request, reply) => {
    const user = await currentUser(request)
    const input = createEventInputSchema.parse(request.body)
    const event = await calendar.create(user.id, input)
    return reply.status(201).send({ event: presentEvent(event) })
  })

  /** Substitui o evento inteiro: o horário é uma escolha entre dois formatos, não um campo solto. */
  app.put('/calendar/events/:id', async (request): Promise<{ event: CalendarEventDto }> => {
    const user = await currentUser(request)
    const id = eventId(request)
    const input = createEventInputSchema.parse(request.body)
    return { event: presentEvent(await calendar.replace(user.id, id, input)) }
  })

  app.delete('/calendar/events/:id', async (request, reply) => {
    const user = await currentUser(request)
    await calendar.delete(user.id, eventId(request))
    return reply.status(204).send()
  })
}
