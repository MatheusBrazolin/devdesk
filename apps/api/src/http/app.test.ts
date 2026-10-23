import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from './session-cookie.js'

describe('HTTP', () => {
  it('GET /api/health', async () => {
    const { app } = await createTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ status: 'ok' })
  })

  it('GET /api/config conta ao front o que está ligado', async () => {
    const { app } = await createTestApp({ github: false })
    const res = await app.inject({ method: 'GET', url: '/api/config' })
    expect(res.json()).toEqual({ githubLoginEnabled: false, demoEnabled: true })
  })

  it('GET /api/me sem sessão responde 401 no formato padrão', async () => {
    const { app } = await createTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/me' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('rota desconhecida responde 404 no formato padrão', async () => {
    const { app } = await createTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/nao-existe' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })
  })

  describe('modo demo', () => {
    it('abre sessão com cookie httpOnly e /me passa a responder', async () => {
      const { app } = await createTestApp()
      const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
      expect(login.statusCode).toBe(200)

      const setCookie = String(login.headers['set-cookie'])
      expect(setCookie).toContain(`${SESSION_COOKIE}=`)
      expect(setCookie).toContain('HttpOnly')
      expect(setCookie).toContain('SameSite=Lax')

      const me = await app.inject({
        method: 'GET',
        url: '/api/me',
        headers: { cookie: cookieHeader(login.headers['set-cookie']) },
      })
      expect(me.json()).toMatchObject({ user: { login: 'demo', isDemo: true } })
    })

    it('logout derruba a sessão', async () => {
      const { app } = await createTestApp()
      const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
      const cookie = cookieHeader(login.headers['set-cookie'])

      const out = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } })
      expect(out.statusCode).toBe(204)

      const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })
      expect(me.statusCode).toBe(401)
    })

    it('responde 403 quando desligado', async () => {
      const { app } = await createTestApp({ demoEnabled: false })
      const res = await app.inject({ method: 'POST', url: '/api/auth/demo' })
      expect(res.statusCode).toBe(403)
    })
  })

  describe('OAuth do GitHub', () => {
    async function startLogin() {
      const ctx = await createTestApp()
      const start = await ctx.app.inject({ method: 'GET', url: '/api/auth/github' })
      const state = new URL(String(start.headers.location)).searchParams.get('state')!
      return { ...ctx, start, state, cookie: cookieHeader(start.headers['set-cookie']) }
    }

    it('redireciona para o GitHub com um state guardado em cookie', async () => {
      const { start, state, cookie } = await startLogin()
      expect(start.statusCode).toBe(302)
      expect(state.length).toBeGreaterThan(20)
      expect(cookie).toContain(`${OAUTH_STATE_COOKIE}=${state}`)
    })

    it('callback válido abre sessão e volta para o front', async () => {
      const { app, state, cookie } = await startLogin()
      const res = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=bom&state=${state}`,
        headers: { cookie },
      })
      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toBe('http://web.test/')
      expect(String(res.headers['set-cookie'])).toContain(`${SESSION_COOKIE}=`)
    })

    it('state diferente do cookie é recusado (proteção contra CSRF)', async () => {
      const { app, cookie } = await startLogin()
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/github/callback?code=bom&state=forjado',
        headers: { cookie },
      })
      expect(res.headers.location).toBe('http://web.test/login?erro=estado-invalido')
      expect(String(res.headers['set-cookie'])).not.toContain(`${SESSION_COOKIE}=`)
    })

    it('code recusado pelo GitHub volta para o login com o motivo', async () => {
      const { app, state, cookie } = await startLogin()
      const res = await app.inject({
        method: 'GET',
        url: `/api/auth/github/callback?code=ruim&state=${state}`,
        headers: { cookie },
      })
      expect(res.headers.location).toBe('http://web.test/login?erro=github')
    })

    it('responde 404 quando o OAuth não está configurado', async () => {
      const { app } = await createTestApp({ github: false })
      const res = await app.inject({ method: 'GET', url: '/api/auth/github' })
      expect(res.statusCode).toBe(404)
    })
  })
})
