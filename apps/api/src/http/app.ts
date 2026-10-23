import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyServerOptions } from 'fastify'
import type { AppDependencies } from './dependencies.js'
import { registerErrorHandler } from './plugins/error-handler.js'
import { authRoutes } from './routes/auth.js'
import { calendarRoutes } from './routes/calendar.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { meRoutes } from './routes/me.js'
import { notesRoutes } from './routes/notes.js'
import { standupRoutes } from './routes/standup.js'
import { systemRoutes } from './routes/system.js'

export async function buildApp(deps: AppDependencies, options: FastifyServerOptions = {}) {
  const app = Fastify(options)

  await app.register(helmet)
  await app.register(cookie)
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' })
  registerErrorHandler(app)

  await app.register(
    async (api) => {
      await systemRoutes(api, deps)
      await authRoutes(api, deps)
      await meRoutes(api, deps)
      await dashboardRoutes(api, deps)
      await notesRoutes(api, deps)
      await calendarRoutes(api, deps)
      await standupRoutes(api, deps)
    },
    { prefix: '/api' },
  )

  return app
}
