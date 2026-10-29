import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'

const prLink = {
  kind: 'pull_request',
  repository: 'umbrella/workers',
  number: 136,
  url: 'https://github.com/umbrella/workers/pull/136',
  title: 'fix(cache): fonte parada',
}

/** App com duas pessoas logadas: a demo e alguém pelo modo pessoal. */
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

describe('notas', () => {
  it('exige sessão', async () => {
    const { app } = await createTestApp()
    const res = await app.inject({ method: 'GET', url: '/api/notes' })
    expect(res.statusCode).toBe(401)
  })

  it('cria, lê, atualiza e apaga', async () => {
    const { app, me } = await twoUsers()
    const created = await app.inject({
      method: 'POST',
      url: '/api/notes',
      headers: me,
      payload: { body: '# Revisar o PR\n- olhar o backoff', tags: ['Review', '#review'] },
    })
    expect(created.statusCode).toBe(201)
    const { note } = created.json()
    expect(note).toMatchObject({ title: '', displayTitle: 'Revisar o PR', tags: ['review'] })

    const patched = await app.inject({
      method: 'PATCH',
      url: `/api/notes/${note.id}`,
      headers: me,
      payload: { title: '  Backoff  ', pinned: true },
    })
    expect(patched.json().note).toMatchObject({
      title: 'Backoff',
      displayTitle: 'Backoff',
      pinned: true,
    })

    const removed = await app.inject({
      method: 'DELETE',
      url: `/api/notes/${note.id}`,
      headers: me,
    })
    expect(removed.statusCode).toBe(204)
    const gone = await app.inject({ method: 'GET', url: `/api/notes/${note.id}`, headers: me })
    expect(gone.statusCode).toBe(404)
  })

  it('uma pessoa não vê, não edita e não apaga a nota de outra', async () => {
    const { app, me, other } = await twoUsers()
    const { note } = (
      await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: me,
        payload: { body: 'minha' },
      })
    ).json()

    const list = await app.inject({ method: 'GET', url: '/api/notes', headers: other })
    expect(list.json().notes).toEqual([])

    for (const [method, payload] of [
      ['GET', undefined],
      ['PATCH', { body: 'invadi' }],
      ['DELETE', undefined],
    ] as const) {
      const res = await app.inject({
        method,
        url: `/api/notes/${note.id}`,
        headers: other,
        payload,
      })
      expect(res.statusCode).toBe(404)
    }

    const mine = await app.inject({ method: 'GET', url: `/api/notes/${note.id}`, headers: me })
    expect(mine.json().note.body).toBe('minha')
  })

  it('filtra por texto, por tag e pelo PR vinculado', async () => {
    const { app, me } = await twoUsers()
    const create = (payload: object) =>
      app.inject({ method: 'POST', url: '/api/notes', headers: me, payload })
    await create({ title: 'Deploy', body: 'checar o staging', tags: ['infra'] })
    await create({ title: 'PR do backoff', links: [prLink], tags: ['review'] })

    const ids = async (query: string) =>
      (await app.inject({ method: 'GET', url: `/api/notes?${query}`, headers: me }))
        .json()
        .notes.map((n: { title: string }) => n.title)

    expect(await ids('q=STAGING')).toEqual(['Deploy'])
    expect(await ids('tag=%23Infra')).toEqual(['Deploy'])
    expect(await ids(`link=${encodeURIComponent(prLink.url)}`)).toEqual(['PR do backoff'])
  })

  it('a busca ignora acentos e maiúsculas, no título e no texto', async () => {
    const { app, me } = await twoUsers()
    const create = (payload: object) =>
      app.inject({ method: 'POST', url: '/api/notes', headers: me, payload })
    await create({ title: 'Cabeçalho', body: 'ajustar o menu' })
    await create({ title: 'Reunião', body: 'revisar a migração do banco' })
    await create({ title: 'cabecalho sem acento' })
    await create({ title: '50% pronto' })

    const ids = async (q: string) =>
      (
        await app.inject({
          method: 'GET',
          url: `/api/notes?q=${encodeURIComponent(q)}`,
          headers: me,
        })
      )
        .json()
        .notes.map((n: { title: string }) => n.title)
        .sort()

    expect(await ids('cabecalho')).toEqual(['Cabeçalho', 'cabecalho sem acento'])
    expect(await ids('CABEÇALHO')).toEqual(['Cabeçalho', 'cabecalho sem acento'])
    expect(await ids('migracao')).toEqual(['Reunião'])
    expect(await ids('reuniao')).toEqual(['Reunião'])
    // % continua literal, não curinga.
    expect(await ids('0%')).toEqual(['50% pronto'])
  })

  it('lista as fixadas primeiro, depois as mais recentes', async () => {
    const { app, me, clock } = await twoUsers()
    const create = async (title: string, pinned = false) => {
      clock.advance(1000)
      await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: me,
        payload: { title, pinned },
      })
    }
    await create('antiga fixada', true)
    await create('nova')
    await create('mais nova')

    const res = await app.inject({ method: 'GET', url: '/api/notes', headers: me })
    expect(res.json().notes.map((n: { title: string }) => n.title)).toEqual([
      'antiga fixada',
      'mais nova',
      'nova',
    ])
  })

  it('conta as tags', async () => {
    const { app, me } = await twoUsers()
    for (const tags of [['review'], ['review', 'infra'], ['infra'], ['review']]) {
      await app.inject({ method: 'POST', url: '/api/notes', headers: me, payload: { tags } })
    }
    const res = await app.inject({ method: 'GET', url: '/api/notes/tags', headers: me })
    expect(res.json().tags).toEqual([
      { tag: 'review', count: 3 },
      { tag: 'infra', count: 2 },
    ])
  })

  it('não repete o mesmo PR vinculado duas vezes', async () => {
    const { app, me } = await twoUsers()
    const res = await app.inject({
      method: 'POST',
      url: '/api/notes',
      headers: me,
      payload: { links: [prLink, { ...prLink, title: 'outro' }] },
    })
    expect(res.json().note.links).toHaveLength(1)
  })

  it.each([
    ['link fora do GitHub', { links: [{ ...prLink, url: 'https://exemplo.com/pull/1' }] }],
    ['tags demais', { tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }],
    ['corpo grande demais', { body: 'x'.repeat(100_001) }],
  ])('recusa %s', async (_case, payload) => {
    const { app, me } = await twoUsers()
    const res = await app.inject({ method: 'POST', url: '/api/notes', headers: me, payload })
    expect(res.statusCode).toBe(400)
  })

  it('PATCH vazio é recusado', async () => {
    const { app, me } = await twoUsers()
    const { note } = (
      await app.inject({ method: 'POST', url: '/api/notes', headers: me, payload: {} })
    ).json()
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/notes/${note.id}`,
      headers: me,
      payload: {},
    })
    expect(res.statusCode).toBe(400)
  })

  it('id que nem é UUID responde 404', async () => {
    const { app, me } = await twoUsers()
    const res = await app.inject({ method: 'GET', url: '/api/notes/nao-e-uuid', headers: me })
    expect(res.statusCode).toBe(404)
  })

  it('corpo text/plain, que outro site manda sem preflight, não cria nota', async () => {
    const { app, me, notes } = await twoUsers()
    const res = await app.inject({
      method: 'POST',
      url: '/api/notes',
      headers: { ...me, 'content-type': 'text/plain' },
      payload: '{"body":"forjada"}',
    })
    expect(res.statusCode).toBe(400)
    expect(notes.items.size).toBe(0)
  })
})
