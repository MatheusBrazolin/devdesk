import {
  type ExternalEventsResponse,
  type SubscriptionsResponse,
  calendarRangeQuerySchema,
  createSubscriptionInputSchema,
} from '@devdesk/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { AppDependencies } from '../dependencies.js'
import { presentExternalEvents, presentSubscription } from '../presenters.js'
import { readSessionToken } from '../session-cookie.js'

const paramsSchema = z.object({ id: z.string() })

/** Agendas externas assinadas pelo link .ics. Só leitura: nada é escrito nelas. */
export async function externalCalendarRoutes(
  app: FastifyInstance,
  deps: AppDependencies,
): Promise<void> {
  const { getCurrentUser, externalCalendars } = deps.useCases
  const currentUser = (request: FastifyRequest) => getCurrentUser.execute(readSessionToken(request))

  app.get('/calendar/subscriptions', async (request): Promise<SubscriptionsResponse> => {
    const user = await currentUser(request)
    const subscriptions = await externalCalendars.list(user)
    return { subscriptions: subscriptions.map(presentSubscription), canEdit: !user.isDemo }
  })

  app.post('/calendar/subscriptions', async (request, reply) => {
    const user = await currentUser(request)
    const input = createSubscriptionInputSchema.parse(request.body)
    const subscription = await externalCalendars.add(user, input)
    return reply.status(201).send({ subscription: presentSubscription(subscription) })
  })

  app.delete('/calendar/subscriptions/:id', async (request, reply) => {
    const user = await currentUser(request)
    await externalCalendars.remove(user, paramsSchema.parse(request.params).id)
    return reply.status(204).send()
  })

  /** Vem de fora e pode demorar: rota à parte, como os prazos, para não segurar os eventos. */
  app.get('/calendar/external', async (request): Promise<ExternalEventsResponse> => {
    const user = await currentUser(request)
    const { from, to } = calendarRangeQuerySchema.parse(request.query)
    const { calendars, unavailable } = await externalCalendars.between(user, from, to)
    return { events: calendars.flatMap(presentExternalEvents), unavailable }
  })
}
