import type { MeResponse } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../dependencies.js'
import { presentUser } from '../presenters.js'
import { readSessionToken } from '../session-cookie.js'

export async function meRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.get('/me', async (request): Promise<MeResponse> => {
    const user = await deps.useCases.getCurrentUser.execute(readSessionToken(request))
    return { user: presentUser(user) }
  })
}
