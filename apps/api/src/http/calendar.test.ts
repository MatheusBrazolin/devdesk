import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'
import { upstream } from '../domain/errors.js'

async function twoUsers() {
  const ctx = await createTestApp({ personalToken: 'ghp_valido' })
  const demo = await ctx.app.inject({ method: 'POST', url: '/api/auth/demo' })
  const other = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/personal',
    headers: { 'content-type': 'application/json' },
    payload: {},
  })
  const as = (res: typeof demo) => ({ cookie: cookieHeader(res.headers['set-cookie']) })
  return { ...ctx, me: as(demo), other: as(other) }
}

const titles = (body: { events: { title: string }[] }) => body.events.map((e) => e.title)

describe('calendário', () => {
  it('exige sessão', async () => {
    const { app } = await createTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar?from=2026-10-01&to=2026-10-31',
    })
    expect(res.statusCode).toBe(401)
  })

  it('cria, lê, substitui e apaga', async () => {
    const { app, me } = await twoUsers()
    const created = await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      headers: me,
      payload: { title: 'Daily', allDay: false, startsAt: '2026-10-26T12:30:00Z' },
    })
    expect(created.statusCode).toBe(201)
    const { event } = created.json()
    expect(event).toMatchObject({
      title: 'Daily',
      allDay: false,
      startsAt: '2026-10-26T12:30:00.000Z',
      kind: 'event',
    })

    const replaced = await app.inject({
      method: 'PUT',
      url: `/api/calendar/events/${event.id}`,
      headers: me,
      payload: { title: 'Planning', allDay: true, date: '2026-10-27', kind: 'reminder' },
    })
    expect(replaced.json().event).toMatchObject({
      title: 'Planning',
      allDay: true,
      date: '2026-10-27',
      kind: 'reminder',
    })
    expect(replaced.json().event).not.toHaveProperty('startsAt')

    expect(
      (await app.inject({ method: 'DELETE', url: `/api/calendar/events/${event.id}`, headers: me }))
        .statusCode,
    ).toBe(204)
    expect(
      (await app.inject({ method: 'GET', url: `/api/calendar/events/${event.id}`, headers: me }))
        .statusCode,
    ).toBe(404)
  })

  it('traz só o que toca o intervalo, inclusive eventos de vários dias', async () => {
    const { app, me } = await twoUsers()
    const create = (payload: object) =>
      app.inject({ method: 'POST', url: '/api/calendar/events', headers: me, payload })
    await create({ title: 'Antes', allDay: true, date: '2026-09-20' })
    await create({
      title: 'Atravessa o mês',
      allDay: true,
      date: '2026-09-29',
      endDate: '2026-10-02',
    })
    await create({ title: 'Dentro', allDay: false, startsAt: '2026-10-15T13:00:00Z' })
    await create({ title: 'Depois', allDay: true, date: '2026-11-10' })

    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar?from=2026-10-01&to=2026-10-31',
      headers: me,
    })
    expect(titles(res.json())).toEqual(['Atravessa o mês', 'Dentro'])
  })

  it('evento com horário perto da virada do dia vem com folga, para o fuso de quem olha', async () => {
    const { app, me } = await twoUsers()
    // 23:30 de 31/10 em São Paulo já é 01/11 em UTC.
    await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      headers: me,
      payload: { title: 'Virada', allDay: false, startsAt: '2026-11-01T02:30:00Z' },
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar?from=2026-10-01&to=2026-10-31',
      headers: me,
    })
    expect(titles(res.json())).toEqual(['Virada'])
  })

  it('uma pessoa não vê nem mexe no evento de outra', async () => {
    const { app, me, other } = await twoUsers()
    const { event } = (
      await app.inject({
        method: 'POST',
        url: '/api/calendar/events',
        headers: me,
        payload: { title: 'Meu', allDay: true, date: '2026-10-24' },
      })
    ).json()

    const list = await app.inject({
      method: 'GET',
      url: '/api/calendar?from=2026-10-01&to=2026-10-31',
      headers: other,
    })
    expect(list.json().events).toEqual([])
    for (const method of ['GET', 'DELETE'] as const) {
      expect(
        (await app.inject({ method, url: `/api/calendar/events/${event.id}`, headers: other }))
          .statusCode,
      ).toBe(404)
    }
    const put = await app.inject({
      method: 'PUT',
      url: `/api/calendar/events/${event.id}`,
      headers: other,
      payload: { title: 'Invadi', allDay: true, date: '2026-10-24' },
    })
    expect(put.statusCode).toBe(404)
  })

  it.each([
    [
      'fim antes do começo',
      { allDay: false, startsAt: '2026-10-26T13:00:00Z', endsAt: '2026-10-26T12:00:00Z' },
    ],
    ['último dia antes do primeiro', { allDay: true, date: '2026-10-26', endDate: '2026-10-20' }],
    ['dia inteiro com horário', { allDay: true, startsAt: '2026-10-26T13:00:00Z' }],
    ['sem título', { title: '', allDay: true, date: '2026-10-26' }],
  ])('recusa %s', async (_case, payload) => {
    const { app, me } = await twoUsers()
    const res = await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      headers: me,
      payload: { title: 'x', ...payload },
    })
    expect(res.statusCode).toBe(400)
  })

  it('recusa intervalo inválido', async () => {
    const { app, me } = await twoUsers()
    const res = await app.inject({
      method: 'GET',
      url: '/api/calendar?from=2026-10-31&to=2026-10-01',
      headers: me,
    })
    expect(res.statusCode).toBe(400)
  })

  it('na demo, os prazos das milestones aparecem', async () => {
    const { app, me, clock } = await twoUsers()
    const today = clock.now().toISOString().slice(0, 10)
    const to = new Date(clock.now().getTime() + 30 * 86_400_000).toISOString().slice(0, 10)
    const res = await app.inject({
      method: 'GET',
      url: `/api/calendar/deadlines?from=${today}&to=${to}`,
      headers: me,
    })
    const body = res.json()
    expect(body.available).toBe(true)
    expect(body.deadlines.map((d: { title: string; items: number }) => [d.title, d.items])).toEqual(
      [
        ['Sprint 42', 2],
        ['Checkout v2', 2],
      ],
    )
  })

  it('GitHub fora do ar: eventos seguem, prazos ficam indisponíveis', async () => {
    const { app, other, githubWork } = await twoUsers()
    githubWork.error = upstream('fora do ar')
    await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      headers: other,
      payload: { title: 'Daily', allDay: true, date: '2026-10-26' },
    })
    const deadlines = await app.inject({
      method: 'GET',
      url: '/api/calendar/deadlines?from=2026-10-01&to=2026-10-31',
      headers: other,
    })
    expect(deadlines.statusCode).toBe(200)
    expect(deadlines.json()).toEqual({ available: false, deadlines: [] })

    const events = await app.inject({
      method: 'GET',
      url: '/api/calendar?from=2026-10-01&to=2026-10-31',
      headers: other,
    })
    expect(titles(events.json())).toEqual(['Daily'])
  })

  it('exporta .ics para download', async () => {
    const { app, me } = await twoUsers()
    await app.inject({
      method: 'POST',
      url: '/api/calendar/events',
      headers: me,
      payload: { title: 'Revisar, com calma; o PR', allDay: true, date: '2026-10-28' },
    })
    const res = await app.inject({ method: 'GET', url: '/api/calendar.ics', headers: me })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toBe('text/calendar; charset=utf-8')
    expect(res.headers['content-disposition']).toBe('attachment; filename="devdesk.ics"')
    expect(res.body).toContain(String.raw`SUMMARY:Revisar\, com calma\; o PR`)
    expect(res.body).toContain('SUMMARY:Prazo: Sprint 42 (acme/web-app)')
  })
})
