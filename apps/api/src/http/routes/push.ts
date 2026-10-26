import { createHash, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { AppError } from '../../domain/errors.js'
import type { AppDependencies } from '../dependencies.js'
import { readSessionToken } from '../session-cookie.js'

const subscriptionSchema = z.object({
  endpoint: z.url().max(2_000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
})
const endpointSchema = z.object({ endpoint: z.string().max(2_000) })

/** Compara pelo hash: o tamanho do segredo não vaza pelo tempo de resposta. */
const sameSecret = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest())

/** Avisos com o app fechado (Web Push). */
export async function pushRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser } = deps.useCases
  const currentUser = (request: FastifyRequest) => getCurrentUser.execute(readSessionToken(request))
  const push = deps.push
  const disabled = () => new AppError('NOT_FOUND', 'Os avisos com o app fechado estão desligados.')

  /** Chave pública VAPID; nula quando o servidor não tem as chaves configuradas. */
  app.get('/push', async (request) => {
    await currentUser(request)
    return { publicKey: push?.notifications.publicKey ?? null }
  })

  app.post('/push/subscriptions', async (request, reply) => {
    const user = await currentUser(request)
    if (!push) throw disabled()
    await push.notifications.subscribe(user, subscriptionSchema.parse(request.body))
    return reply.status(204).send()
  })

  app.delete('/push/subscriptions', async (request, reply) => {
    const user = await currentUser(request)
    if (!push) throw disabled()
    await push.notifications.unsubscribe(user, endpointSchema.parse(request.body).endpoint)
    return reply.status(204).send()
  })

  /** Chamada pelo agendador (GitHub Actions), com o segredo no cabeçalho. */
  app.post('/push/run', async (request) => {
    if (!push?.cronSecret) throw disabled()
    const header = request.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token || !sameSecret(token, push.cronSecret)) {
      throw new AppError('UNAUTHENTICATED', 'Segredo do agendador inválido.')
    }
    return push.notifications.run()
  })
}
