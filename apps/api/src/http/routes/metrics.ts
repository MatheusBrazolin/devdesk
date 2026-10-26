import type { Metrics } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../dependencies.js'
import { readSessionToken } from '../session-cookie.js'

export async function metricsRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, getMetrics } = deps.useCases

  app.get('/metrics', async (request): Promise<Metrics> => {
    const user = await getCurrentUser.execute(readSessionToken(request))
    const result = await getMetrics.execute(user)
    return { ...result, fetchedAt: result.fetchedAt.toISOString() }
  })
}
