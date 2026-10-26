import { metricsSchema } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'

describe('GET /api/metrics', () => {
  it('sem sessão é 401', async () => {
    const { app } = await createTestApp()
    expect((await app.inject({ url: '/api/metrics' })).statusCode).toBe(401)
  })

  it('na demonstração, oito semanas de exemplo no formato do contrato', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo', payload: {} })
    const res = await app.inject({
      url: '/api/metrics',
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.statusCode).toBe(200)
    const metrics = metricsSchema.parse(res.json())
    expect(metrics.isSample).toBe(true)
    expect(metrics.weeks).toHaveLength(8)
    expect(metrics.totals.merged).toBeGreaterThan(0)
    expect(metrics.totals.medianHoursToMerge).not.toBeNull()
  })
})
