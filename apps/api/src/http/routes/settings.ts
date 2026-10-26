import type { Settings } from '@devdesk/shared'
import { settingsSchema } from '@devdesk/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AppDependencies } from '../dependencies.js'
import { readSessionToken } from '../session-cookie.js'

export async function settingsRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, settings } = deps.useCases
  const currentUser = (request: FastifyRequest) => getCurrentUser.execute(readSessionToken(request))

  app.get('/settings', async (request): Promise<{ settings: Settings }> => {
    const user = await currentUser(request)
    return { settings: await settings.get(user.id) }
  })

  app.put('/settings', async (request): Promise<{ settings: Settings }> => {
    const user = await currentUser(request)
    return { settings: await settings.update(user, settingsSchema.parse(request.body)) }
  })
}
