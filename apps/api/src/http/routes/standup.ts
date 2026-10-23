import { type Standup, standupQuerySchema } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../dependencies.js'
import { readSessionToken } from '../session-cookie.js'

export async function standupRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, getStandup } = deps.useCases

  /** O período vem do front: o dia útil anterior depende do fuso e do dia da semana de quem pede. */
  app.get('/standup', async (request): Promise<Standup> => {
    const user = await getCurrentUser.execute(readSessionToken(request))
    const { from, to } = standupQuerySchema.parse(request.query)
    return getStandup.execute(user, new Date(from), new Date(to))
  })
}
