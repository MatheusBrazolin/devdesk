import { settingsResponseSchema } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'

const GOOGLE = 'https://calendar.google.com/calendar/ical/eu/private-segredo/basic.ics'
const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR'

async function signedIn() {
  const ctx = await createTestApp({ personalToken: 'ghp_valido' })
  const login = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/personal',
    headers: { 'content-type': 'application/json' },
    payload: {},
  })
  return { ...ctx, headers: { cookie: cookieHeader(login.headers['set-cookie']) } }
}

describe('configurações', () => {
  it('vêm com os padrões e guardam o que muda', async () => {
    const { app, headers } = await signedIn()
    const initial = settingsResponseSchema.parse(
      (await app.inject({ url: '/api/settings', headers })).json(),
    )
    expect(initial.settings.teamRepositories).toBeNull()
    expect(Object.values(initial.settings.notifications).every(Boolean)).toBe(true)

    const saved = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers,
      payload: {
        notifications: { ...initial.settings.notifications, ci_failed: false },
        teamRepositories: ['acme/web', 'acme/web', 'acme/api'],
      },
    })
    expect(saved.statusCode).toBe(200)
    expect(saved.json().settings).toMatchObject({
      notifications: { ci_failed: false, review_requested: true },
      teamRepositories: ['acme/web', 'acme/api'],
    })
    expect((await app.inject({ url: '/api/settings', headers })).json()).toEqual(saved.json())
  })

  it('recusa repositório fora do formato e lista vazia volta ao automático', async () => {
    const { app, headers } = await signedIn()
    const bad = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers,
      payload: { teamRepositories: ['não é repo'] },
    })
    expect(bad.statusCode).toBe(400)

    const empty = await app.inject({
      method: 'PUT',
      url: '/api/settings',
      headers,
      payload: { teamRepositories: [] },
    })
    expect(empty.json().settings.teamRepositories).toBeNull()
  })
})

describe('meus dados', () => {
  it('exporta notas, eventos, configurações e agendas, sem segredos', async () => {
    const { app, headers, icsFetcher } = await signedIn()
    icsFetcher.feeds.set(GOOGLE, ICS)
    await app.inject({
      method: 'POST',
      url: '/api/notes',
      headers,
      payload: { title: 'Nota minha', body: 'conteúdo' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      headers,
      payload: { title: 'Dentista', allDay: true, date: '2026-11-03' },
    })
    await app.inject({
      method: 'POST',
      url: '/api/calendar/subscriptions',
      headers,
      payload: { name: 'Trabalho', url: GOOGLE },
    })

    const res = await app.inject({ url: '/api/me/export', headers })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-disposition']).toMatch(/attachment; filename="devdesk-octocat-/)
    const data = res.json()
    expect(data.format).toBe('devdesk-export')
    expect(data.notes.map((n: { title: string }) => n.title)).toEqual(['Nota minha'])
    expect(data.events.map((e: { title: string }) => e.title)).toEqual(['Dentista'])
    expect(data.calendarSubscriptions).toEqual([expect.objectContaining({ name: 'Trabalho' })])
    expect(res.body).not.toContain('private-segredo')
    expect(res.body).not.toContain('gho_')
  })

  it('apaga a conta só com o login digitado, e a sessão morre junto', async () => {
    const { app, headers, users } = await signedIn()
    const wrong = await app.inject({
      method: 'DELETE',
      url: '/api/me',
      headers,
      payload: { confirmation: 'outra-pessoa' },
    })
    expect(wrong.statusCode).toBe(400)
    expect(users.items.size).toBe(1)

    const res = await app.inject({
      method: 'DELETE',
      url: '/api/me',
      headers,
      payload: { confirmation: 'OctoCat' },
    })
    expect(res.statusCode).toBe(204)
    expect(String(res.headers['set-cookie'])).toContain('Expires=Thu, 01 Jan 1970')
    expect(users.items.size).toBe(0)
    expect((await app.inject({ url: '/api/me', headers })).statusCode).toBe(401)
  })
})
