import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'
import { registerErrorHandler } from './plugins/error-handler.js'

describe('proteções da API', () => {
  it('recusa escrita vinda de outro site, mesmo para entrar na demonstração', async () => {
    const { app } = await createTestApp()
    const forged = await app.inject({
      method: 'POST',
      url: '/api/auth/demo',
      headers: { origin: 'https://evil.example', 'content-type': 'text/plain' },
      payload: 'x=1',
    })
    expect(forged.statusCode).toBe(403)
    expect(forged.headers['set-cookie']).toBeUndefined()

    const crossSite = await app.inject({
      method: 'POST',
      url: '/api/auth/demo',
      headers: { 'sec-fetch-site': 'cross-site' },
    })
    expect(crossSite.statusCode).toBe(403)
  })

  it('aceita escrita do próprio app e leitura de qualquer lugar', async () => {
    const { app } = await createTestApp()
    const demo = await app.inject({
      method: 'POST',
      url: '/api/auth/demo',
      headers: { 'sec-fetch-site': 'same-origin' },
    })
    expect(demo.statusCode).toBe(200)
    const read = await app.inject({
      method: 'GET',
      url: '/api/me',
      headers: { cookie: cookieHeader(demo.headers['set-cookie']), origin: 'https://evil.example' },
    })
    expect(read.statusCode).toBe(200)
  })

  it('limita quantas contas de demonstração um IP cria por minuto', async () => {
    const { app } = await createTestApp()
    const codes: number[] = []
    for (let i = 0; i < 11; i++) {
      codes.push((await app.inject({ method: 'POST', url: '/api/auth/demo' })).statusCode)
    }
    expect(codes.slice(0, 10).every((code) => code === 200)).toBe(true)
    expect(codes[10]).toBe(429)
  })

  it('agenda só perto de agora: ano 2400 ou 9999 é 400, não CPU nem 500', async () => {
    const { app } = await createTestApp()
    const demo = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const headers = { cookie: cookieHeader(demo.headers['set-cookie']) }
    for (const url of [
      '/api/calendar/external?from=2400-01-01&to=2400-01-02',
      '/api/calendar?from=9999-12-30&to=9999-12-30',
    ]) {
      const res = await app.inject({ method: 'GET', url, headers })
      expect(res.statusCode, url).toBe(400)
    }
  })

  it('erro de dado do Postgres (ex.: caractere nulo no texto) vira 400', async () => {
    const app = Fastify()
    registerErrorHandler(app)
    app.get('/nul', async () => {
      throw Object.assign(new Error('falhou'), {
        cause: Object.assign(new Error('invalid byte sequence'), { code: '22021' }),
      })
    })
    const res = await app.inject({ method: 'GET', url: '/nul' })
    expect(res.statusCode).toBe(400)
  })
})
