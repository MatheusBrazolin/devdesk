import { teamSchema } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'

describe('GET /api/team', () => {
  it('sem sessão é 401', async () => {
    const { app } = await createTestApp()
    expect((await app.inject({ url: '/api/team' })).statusCode).toBe(401)
  })

  it('na demonstração, um time de exemplo no formato do contrato', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const res = await app.inject({
      url: '/api/team',
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.statusCode).toBe(200)
    const team = teamSchema.parse(res.json())
    expect(team.isSample).toBe(true)
    // Rascunho e aprovado ficam fora da fila; o mais antigo vem primeiro.
    expect(team.queue[0]!.title).toBe('Alerta de fila parada no worker de e-mails')
    expect(team.queue.some((pr) => pr.title.startsWith('Tokens de cor'))).toBe(false)
    expect(team.reviewLoad[0]).toEqual({ reviewer: 'rafael-lima', pending: 3 })
  })
})
