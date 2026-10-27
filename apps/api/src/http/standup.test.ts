import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'

const period = 'from=2026-10-22T03:00:00Z&to=2026-10-23T03:00:00Z'

describe('GET /api/standup', () => {
  it('exige sessão', async () => {
    const { app } = await createTestApp()
    expect((await app.inject({ method: 'GET', url: `/api/standup?${period}` })).statusCode).toBe(
      401,
    )
  })

  it('na demo, monta feito, hoje e bloqueios com dados de exemplo', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const res = await app.inject({
      method: 'GET',
      url: `/api/standup?${period}`,
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.isSample).toBe(true)
    expect(body.done.map((i: { kind: string }) => i.kind)).toEqual([
      'merged',
      'opened',
      'reviewed',
      'reviewed',
      'closed_issue',
    ])
    expect(body.today[0].kind).toBe('review_requested')
  })

  it('pede ao GitHub o período e o login da pessoa', async () => {
    const { app, activity } = await createTestApp({ personalToken: 'ghp_valido' })
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: { 'content-type': 'application/json' },
      payload: {},
    })
    activity.result = {
      merged: [{ title: 'x', url: 'https://github.com/a/b/pull/1', repository: 'a/b', number: 1 }],
      opened: [],
      reviewed: [],
      closedIssues: [],
    }
    const res = await app.inject({
      method: 'GET',
      url: `/api/standup?${period}`,
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.json().done).toHaveLength(1)
    expect(activity.calls[0]).toEqual({
      login: 'octocat',
      from: new Date('2026-10-22T03:00:00Z'),
      to: new Date('2026-10-23T03:00:00Z'),
    })
  })

  it.each([
    ['período invertido', 'from=2026-10-23T03:00:00Z&to=2026-10-22T03:00:00Z'],
    ['período longo demais', 'from=2026-10-01T03:00:00Z&to=2026-10-23T03:00:00Z'],
    ['sem período', ''],
  ])('recusa %s', async (_case, query) => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const res = await app.inject({
      method: 'GET',
      url: `/api/standup?${query}`,
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('GET /api/week', () => {
  it('aceita a semana inteira e pede ao GitHub o período todo', async () => {
    const { app, activity } = await createTestApp({ personalToken: 'ghp_valido' })
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/personal',
      headers: { 'content-type': 'application/json' },
      payload: {},
    })
    const week = 'from=2026-10-19T03:00:00Z&to=2026-10-26T03:00:00Z'
    const res = await app.inject({
      method: 'GET',
      url: `/api/week?${week}`,
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.statusCode).toBe(200)
    expect(activity.calls[0]).toMatchObject({
      from: new Date('2026-10-19T03:00:00Z'),
      to: new Date('2026-10-26T03:00:00Z'),
    })
  })

  it('recusa mais de oito dias', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const res = await app.inject({
      method: 'GET',
      url: '/api/week?from=2026-10-01T03:00:00Z&to=2026-10-26T03:00:00Z',
      headers: { cookie: cookieHeader(login.headers['set-cookie']) },
    })
    expect(res.statusCode).toBe(400)
  })
})
