import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { AppError, forbidden } from '../../domain/errors.js'
import type { AppDependencies } from '../dependencies.js'
import { presentUser } from '../presenters.js'
import {
  OAUTH_STATE_COOKIE,
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from '../session-cookie.js'

const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
})

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

const sameState = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

export async function authRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { config, github, useCases } = deps
  const cookies = { secure: config.secureCookies }
  const loginErrorUrl = (reason: string) =>
    `${config.webOrigin}/login?erro=${encodeURIComponent(reason)}`

  app.get('/auth/github', async (_request, reply) => {
    if (!github) throw new AppError('NOT_FOUND', 'Login com GitHub não configurado.')

    const state = randomBytes(24).toString('base64url')
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: cookies.secure,
      path: '/',
      maxAge: 10 * 60,
    })
    return reply.redirect(github.oauth.authorizeUrl(state))
  })

  app.get('/auth/github/callback', async (request, reply) => {
    if (!github) throw new AppError('NOT_FOUND', 'Login com GitHub não configurado.')

    const query = callbackQuerySchema.parse(request.query)
    const expectedState = request.cookies[OAUTH_STATE_COOKIE]
    reply.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })

    if (query.error) return reply.redirect(loginErrorUrl('cancelado'))
    if (!query.code || !query.state || !expectedState || !sameState(query.state, expectedState)) {
      return reply.redirect(loginErrorUrl('estado-invalido'))
    }

    try {
      const session = await github.completeLogin.execute(query.code)
      setSessionCookie(reply, cookies, session)
      return reply.redirect(`${config.webOrigin}/`)
    } catch (error) {
      request.log.warn({ err: error }, 'falha no callback do GitHub')
      return reply.redirect(loginErrorUrl('github'))
    }
  })

  app.post('/auth/personal', async (request, reply) => {
    if (!deps.personal) throw new AppError('NOT_FOUND', 'Modo pessoal desligado.')
    if (!LOOPBACK.has(request.ip)) throw forbidden('O modo pessoal só aceita acesso desta máquina.')
    // Corpo JSON obriga o navegador a pedir permissão (CORS) antes de um POST
    // vindo de outro site, e a API não concede: bloqueia login forjado.
    if (!request.headers['content-type']?.startsWith('application/json')) {
      throw new AppError('VALIDATION', 'Envie a requisição como JSON.')
    }

    const session = await deps.personal.execute()
    setSessionCookie(reply, cookies, session)
    const user = await useCases.getCurrentUser.execute(session.token)
    return { user: presentUser(user) }
  })

  app.post('/auth/demo', async (_request, reply) => {
    const session = await useCases.startDemoSession.execute()
    setSessionCookie(reply, cookies, session)
    const user = await useCases.getCurrentUser.execute(session.token)
    return { user: presentUser(user) }
  })

  app.post('/auth/logout', async (request, reply) => {
    await useCases.logout.execute(readSessionToken(request))
    clearSessionCookie(reply)
    return reply.status(204).send()
  })
}
