import type { MeResponse } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { AppDependencies } from '../dependencies.js'
import { presentEvent, presentNote, presentSubscription, presentUser } from '../presenters.js'
import { clearSessionCookie, readSessionToken } from '../session-cookie.js'

const deleteSchema = z.object({ confirmation: z.string().max(100) })

export async function meRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, account } = deps.useCases

  app.get('/me', async (request): Promise<MeResponse> => {
    const user = await getCurrentUser.execute(readSessionToken(request))
    return { user: presentUser(user) }
  })

  /** Tudo o que o DevDesk guarda da pessoa, num JSON para baixar (portabilidade, LGPD). */
  app.get('/me/export', async (request, reply) => {
    const user = await getCurrentUser.execute(readSessionToken(request))
    const data = await account.export(user)
    const day = data.exportedAt.toISOString().slice(0, 10)
    return reply
      .header('content-disposition', `attachment; filename="devdesk-${user.login}-${day}.json"`)
      .header('cache-control', 'no-store')
      .send({
        format: 'devdesk-export',
        version: 1,
        exportedAt: data.exportedAt.toISOString(),
        user: { ...presentUser(user), createdAt: user.createdAt.toISOString() },
        settings: data.settings,
        notes: data.notes.map(presentNote),
        events: data.events.map(presentEvent),
        calendarSubscriptions: data.subscriptions.map(presentSubscription),
        about:
          'Os dados do GitHub não entram: o DevDesk só lê, e eles continuam no GitHub. ' +
          'Os endereços das agendas assinadas e o token do GitHub também não: são segredos e ficam cifrados.',
      })
  })

  /** Apaga a conta e tudo o que é dela. Pede o login digitado de novo como confirmação. */
  app.delete('/me', async (request, reply) => {
    const user = await getCurrentUser.execute(readSessionToken(request))
    await account.delete(user, deleteSchema.parse(request.body).confirmation)
    clearSessionCookie(reply)
    return reply.status(204).send()
  })
}
