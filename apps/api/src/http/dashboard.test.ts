import { dashboardSchema } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'
import { githubReconnect } from '../domain/errors.js'

describe('GET /api/dashboard', () => {
  it('exige sessão', async () => {
    const { app } = await createTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/dashboard' })
    expect(res.statusCode).toBe(401)
  })

  it('no modo demo, responde no formato do contrato e marcado como exemplo', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const res = await app.inject({
      method: 'GET',
      url: '/api/dashboard',
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })

    expect(res.statusCode).toBe(200)
    const dashboard = dashboardSchema.parse(res.json())
    expect(dashboard.isSample).toBe(true)
    expect(dashboard.attention[0]?.reason).toBe('review_requested')
  })

  it('token do GitHub recusado responde 401 com código próprio (não derruba a sessão)', async () => {
    const { app, githubWork } = await createTestApp()
    const start = await app.inject({ method: 'GET', url: '/api/auth/github' })
    const state = new URL(String(start.headers.location)).searchParams.get('state')!
    const callback = await app.inject({
      method: 'GET',
      url: `/api/auth/github/callback?code=bom&state=${state}`,
      headers: { cookie: cookieHeader(start.headers['set-cookie']) },
    })
    const cookie = cookieHeader(callback.headers['set-cookie'])

    githubWork.error = githubReconnect()
    const res = await app.inject({ method: 'GET', url: '/api/dashboard', headers: { cookie } })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toMatchObject({ error: { code: 'GITHUB_RECONNECT' } })

    const me = await app.inject({ method: 'GET', url: '/api/me', headers: { cookie } })
    expect(me.statusCode).toBe(200)
  })

  it('rejeita refresh com valor inválido', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const res = await app.inject({
      method: 'GET',
      url: '/api/dashboard?refresh=sim',
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.statusCode).toBe(400)
  })
})
