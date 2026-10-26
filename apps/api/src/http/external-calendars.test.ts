import { externalEventsResponseSchema, subscriptionsResponseSchema } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'
import { FEED_TTL_MS } from '../application/use-cases/external-calendars.js'

const GOOGLE = 'https://calendar.google.com/calendar/ical/eu%40gmail.com/private-segredo/basic.ics'

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:retro',
  'SUMMARY:Retrospectiva',
  'DTSTART:20261023T170000Z',
  'DTEND:20261023T180000Z',
  'RRULE:FREQ=WEEKLY',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

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

const range = '/api/calendar/external?from=2026-10-23&to=2026-11-06'

describe('agendas externas', () => {
  it('exige sessão', async () => {
    const { app } = await createTestApp()
    expect((await app.inject({ url: '/api/calendar/subscriptions' })).statusCode).toBe(401)
    expect((await app.inject({ url: range })).statusCode).toBe(401)
  })

  it('assina pelo link, mostra as repetições e nunca devolve o endereço', async () => {
    const { app, headers, icsFetcher, subscriptions } = await signedIn()
    icsFetcher.feeds.set(GOOGLE, ICS)

    const created = await app.inject({
      method: 'POST',
      url: '/api/calendar/subscriptions',
      headers,
      payload: { name: 'Trabalho', url: GOOGLE },
    })
    expect(created.statusCode).toBe(201)
    expect(created.body).not.toContain('segredo')
    expect(created.json().subscription).toMatchObject({
      name: 'Trabalho',
      provider: 'Google Agenda',
    })

    // No banco, só cifrado.
    expect(subscriptions.items[0]!.urlEncrypted).not.toContain('segredo')

    const list = await app.inject({ url: '/api/calendar/subscriptions', headers })
    expect(list.body).not.toContain('segredo')
    expect(subscriptionsResponseSchema.parse(list.json()).canEdit).toBe(true)

    const events = externalEventsResponseSchema.parse(
      (await app.inject({ url: range, headers })).json(),
    )
    expect(events.unavailable).toEqual([])
    expect(events.events.map((e) => [e.title, e.allDay ? e.date : e.startsAt])).toEqual([
      ['Retrospectiva', '2026-10-23T17:00:00.000Z'],
      ['Retrospectiva', '2026-10-30T17:00:00.000Z'],
      ['Retrospectiva', '2026-11-06T17:00:00.000Z'],
    ])
    expect(events.events[0]!.calendar).toBe('Trabalho')
  })

  it('recusa endereço de fora da lista sem nem buscar', async () => {
    const { app, headers, icsFetcher } = await signedIn()
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/subscriptions',
      headers,
      payload: { name: 'Interna', url: 'https://169.254.169.254/latest/meta-data' },
    })
    expect(res.statusCode).toBe(400)
    expect(icsFetcher.calls).toEqual([])
  })

  it('avisa na hora quando o link não é uma agenda', async () => {
    const { app, headers, icsFetcher, subscriptions } = await signedIn()
    icsFetcher.feeds.set(GOOGLE, '<html>faça login</html>')
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/subscriptions',
      headers,
      payload: { name: 'Trabalho', url: GOOGLE },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.message).toContain('Não consegui ler')
    expect(subscriptions.items).toHaveLength(0)
  })

  it('reaproveita a agenda por 15 minutos e segura a última quando o provedor cai', async () => {
    const { app, headers, icsFetcher, clock } = await signedIn()
    icsFetcher.feeds.set(GOOGLE, ICS)
    await app.inject({
      method: 'POST',
      url: '/api/calendar/subscriptions',
      headers,
      payload: { name: 'Trabalho', url: GOOGLE },
    })
    await app.inject({ url: range, headers })
    expect(icsFetcher.calls).toHaveLength(1)

    clock.advance(FEED_TTL_MS + 1)
    icsFetcher.feeds.delete(GOOGLE)
    const stale = externalEventsResponseSchema.parse(
      (await app.inject({ url: range, headers })).json(),
    )
    expect(icsFetcher.calls).toHaveLength(2)
    expect(stale.events).toHaveLength(3)
  })

  it('remove a assinatura; a demonstração não remove nada', async () => {
    const { app, headers, icsFetcher } = await signedIn()
    icsFetcher.feeds.set(GOOGLE, ICS)
    const created = await app.inject({
      method: 'POST',
      url: '/api/calendar/subscriptions',
      headers,
      payload: { name: 'Trabalho', url: GOOGLE },
    })
    const id = created.json().subscription.id
    const demo = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const other = { cookie: cookieHeader(demo.headers['set-cookie']) }

    const url = `/api/calendar/subscriptions/${id}`
    expect((await app.inject({ method: 'DELETE', url, headers: other })).statusCode).toBe(403)
    expect((await app.inject({ method: 'DELETE', url, headers })).statusCode).toBe(204)
    expect((await app.inject({ method: 'DELETE', url, headers })).statusCode).toBe(404)
  })

  it('na demonstração, a agenda de exemplo já vem conectada e não muda', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const headers = { cookie: cookieHeader(login.headers['set-cookie']) }

    const list = subscriptionsResponseSchema.parse(
      (await app.inject({ url: '/api/calendar/subscriptions', headers })).json(),
    )
    expect(list).toMatchObject({ canEdit: false, subscriptions: [{ name: 'Agenda de exemplo' }] })

    const events = externalEventsResponseSchema.parse(
      (await app.inject({ url: range, headers })).json(),
    )
    expect(events.events.some((e) => e.title === 'Daily do time')).toBe(true)

    const add = await app.inject({
      method: 'POST',
      url: '/api/calendar/subscriptions',
      headers,
      payload: { name: 'X', url: GOOGLE },
    })
    expect(add.statusCode).toBe(403)
  })
})
