import type { PublicConfig } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../dependencies.js'

export async function systemRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  app.get('/health', async () => ({ status: 'ok' }))

  app.get('/config', async (): Promise<PublicConfig> => ({
    githubLoginEnabled: deps.github !== null,
    demoEnabled: deps.config.demoEnabled,
  }))
}
