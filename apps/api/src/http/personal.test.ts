import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'

const json = { 'content-type': 'application/json' }

describe('modo pessoal', () => {
  it('/config mostra o dono do token', async () => {
    const { app } = await createTestApp({ personalToken: 'ghp_valido' })
    const res = await app.inject({ method: 'GET', url: '/api/config' })
    expect(res.json()).toMatchObject({ personalTokenEnabled: true, personalLogin: 'octocat' })
  })

  it('/config consulta o GitHub uma vez só', async () => {
    const { app, profiles } = await createTestApp({ personalToken: 'ghp_valido' })
    await app.inject({ method: 'GET', url: '/api/config' })
    await app.inject({ method: 'GET', url: '/api/config' })
    expect(profiles.calls).toBe(1)
  })

  it('token recusado: modo ligado, mas sem dono (o front explica)', async () => {
    const { app } = await createTestApp({ personalToken: 'ghp_revogado' })
    const res = await app.inject({ method: 'GET', url: '/api/config' })
    expect(res.json()).toMatchObject({ personalTokenEnabled: true, personalLogin: null })
  })

  it('entra como o dono do token e guarda o token para o painel', async () => {
    const { app, users, cipher } = await createTestApp({ personalToken: 'ghp_valido' })
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: json,
      payload: {},
    })
    expect(login.statusCode).toBe(200)
    expect(login.json()).toMatchObject({ user: { login: 'octocat', isDemo: false } })

    const [user] = [...users.items.values()]
    const stored = users.tokens.get(user!.id)!
    expect(cipher.decrypt(stored.accessToken)).toBe('ghp_valido')
    expect(stored.accessTokenExpiresAt).toBeNull()

    const me = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(me.statusCode).toBe(200)
  })

  it('exige JSON: text/plain, que outro site manda sem preflight, é recusado', async () => {
    const { app } = await createTestApp({ personalToken: 'ghp_valido' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: { 'content-type': 'text/plain' },
      payload: 'oi',
    })
    expect(res.statusCode).toBe(400)
    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('formulário HTML também não abre sessão', async () => {
    const { app } = await createTestApp({ personalToken: 'ghp_valido' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'a=1',
    })
    expect(res.statusCode).toBeGreaterThanOrEqual(400)
    expect(res.headers['set-cookie']).toBeUndefined()
  })

  it('recusa acesso de fora desta máquina', async () => {
    const { app } = await createTestApp({ personalToken: 'ghp_valido' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: json,
      payload: {},
      remoteAddress: '192.168.0.20',
    })
    expect(res.statusCode).toBe(403)
  })

  it('token revogado no login pede reconexão', async () => {
    const { app } = await createTestApp({ personalToken: 'ghp_revogado' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: json,
      payload: {},
    })
    expect(res.json()).toMatchObject({ error: { code: 'GITHUB_RECONNECT' } })
  })

  it('desligado: a rota não existe', async () => {
    const { app } = await createTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: json,
      payload: {},
    })
    expect(res.statusCode).toBe(404)
    const config = await app.inject({ method: 'GET', url: '/api/config' })
    expect(config.json()).toMatchObject({ personalTokenEnabled: false, personalLogin: null })
  })
})
