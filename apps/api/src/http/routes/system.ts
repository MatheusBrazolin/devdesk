import type { PublicConfig } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../dependencies.js'

export async function systemRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/config', async (request): Promise<PublicConfig> => {
    let personalLogin: string | null = null
    if (deps.personal) {
      personalLogin = await deps.personal
        .profile()
        .then((profile) => profile.login)
        .catch((error: unknown) => {
          request.log.warn({ err: error }, 'token pessoal recusado pelo GitHub')
          return null
        })
    }
    return {
      githubLoginEnabled: deps.github !== null,
      demoEnabled: deps.config.demoEnabled,
      personalTokenEnabled: deps.personal !== null,
      personalLogin,
    }
  })
}
