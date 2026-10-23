import type { Dashboard } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { AppDependencies } from '../dependencies.js'
import { presentDashboard } from '../presenters.js'
import { readSessionToken } from '../session-cookie.js'

const querySchema = z.object({
  /** Ignora o cache e busca de novo no GitHub. */
  refresh: z.enum(['true', 'false']).optional(),
})

export async function dashboardRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, getDashboard } = deps.useCases

  app.get('/dashboard', async (request): Promise<Dashboard> => {
    const { refresh } = querySchema.parse(request.query)
    const user = await getCurrentUser.execute(readSessionToken(request))
    const result = await getDashboard.execute(user, { refresh: refresh === 'true' })
    return presentDashboard(result)
  })
}
