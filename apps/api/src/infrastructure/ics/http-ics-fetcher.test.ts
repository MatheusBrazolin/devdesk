import { describe, expect, it } from 'vitest'
import { HttpIcsFetcher } from './http-ics-fetcher.js'

const google = new URL('https://calendar.google.com/calendar/ical/x/private-abc/basic.ics')

function fakeFetch(responses: Record<string, () => Response>) {
  const calls: string[] = []
  const impl = (async (input: URL | string) => {
    const url = String(input)
    calls.push(url)
    const make = responses[url]
    if (!make) throw new Error(`inesperado: ${url}`)
    return make()
  }) as typeof fetch
  return { impl, calls }
}

describe('HttpIcsFetcher', () => {
  it('devolve o texto da agenda', async () => {
    const { impl } = fakeFetch({ [google.href]: () => new Response('BEGIN:VCALENDAR') })
    await expect(new HttpIcsFetcher(impl).fetch(google)).resolves.toBe('BEGIN:VCALENDAR')
  })

  it('segue redirecionamento só para hosts permitidos', async () => {
    const outlook = 'https://outlook.office365.com/owa/calendar/a/b/calendar.ics'
    const ok = fakeFetch({
      [google.href]: () => new Response(null, { status: 302, headers: { location: outlook } }),
      [outlook]: () => new Response('BEGIN:VCALENDAR'),
    })
    await expect(new HttpIcsFetcher(ok.impl).fetch(google)).resolves.toBe('BEGIN:VCALENDAR')

    const evil = fakeFetch({
      [google.href]: () =>
        new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/' } }),
    })
    await expect(new HttpIcsFetcher(evil.impl).fetch(google)).rejects.toThrow('fora da lista')
    expect(evil.calls).toEqual([google.href])
  })

  it('recusa erro do provedor e agenda grande demais', async () => {
    const notFound = fakeFetch({ [google.href]: () => new Response('nada', { status: 404 }) })
    await expect(new HttpIcsFetcher(notFound.impl).fetch(google)).rejects.toThrow('404')

    const huge = fakeFetch({
      [google.href]: () => new Response('x'.repeat(5 * 1024 * 1024 + 1)),
    })
    await expect(new HttpIcsFetcher(huge.impl).fetch(google)).rejects.toThrow('grande demais')
  })
})
