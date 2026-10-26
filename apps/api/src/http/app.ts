import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify, { type FastifyServerOptions } from 'fastify'
import type { AppDependencies } from './dependencies.js'
import { registerErrorHandler, sendNotFound } from './plugins/error-handler.js'
import { registerWebApp } from './plugins/web-app.js'
import { authRoutes } from './routes/auth.js'
import { calendarRoutes } from './routes/calendar.js'
import { externalCalendarRoutes } from './routes/external-calendars.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { meRoutes } from './routes/me.js'
import { notesRoutes } from './routes/notes.js'
import { standupRoutes } from './routes/standup.js'
import { metricsRoutes } from './routes/metrics.js'
import { teamRoutes } from './routes/team.js'
import { pushRoutes } from './routes/push.js'
import { systemRoutes } from './routes/system.js'

interface BuildOptions extends FastifyServerOptions {
  /** Pasta do front compilado. Sem ela (desenvolvimento), o Vite serve o front. */
  webDistDir?: string
  /** Requisições por minuto por IP. */
  rateLimitPerMinute?: number
}

/**
 * Política de conteúdo para a página servida daqui: só scripts próprios
 * (nada inline), imagens dos avatares do GitHub e chamadas à própria origem.
 */
const contentSecurityPolicy = {
  directives: {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https://github.com', 'https://avatars.githubusercontent.com'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'", 'https://github.com'],
  },
}

export async function buildApp(deps: AppDependencies, options: BuildOptions = {}) {
  const { webDistDir, rateLimitPerMinute = 300, ...fastifyOptions } = options
  const app = Fastify(fastifyOptions)

  await app.register(helmet, { contentSecurityPolicy })
  await app.register(cookie)
  await app.register(rateLimit, { max: rateLimitPerMinute, timeWindow: '1 minute' })
  registerErrorHandler(app)

  await app.register(
    async (api) => {
      await systemRoutes(api, deps)
      await authRoutes(api, deps)
      await meRoutes(api, deps)
      await dashboardRoutes(api, deps)
      await notesRoutes(api, deps)
      await calendarRoutes(api, deps)
      await externalCalendarRoutes(api, deps)
      await standupRoutes(api, deps)
      await metricsRoutes(api, deps)
      await teamRoutes(api, deps)
      await pushRoutes(api, deps)
    },
    { prefix: '/api' },
  )

  // Com o front, o 404 de uma página devolve o app; em /api continua JSON.
  if (webDistDir) await registerWebApp(app, webDistDir)
  else app.setNotFoundHandler((_request, reply) => sendNotFound(reply))

  return app
}
