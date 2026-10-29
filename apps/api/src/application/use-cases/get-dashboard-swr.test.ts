import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createTestContext } from '../../../test/helpers.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import { FRESH_MS, MAX_STALE_MS, RETRY_AFTER_FAILURE_MS } from './get-dashboard.js'

async function githubUser() {
  const ctx = createTestContext()
  await ctx.deps.github!.completeLogin.execute('bom')
  const [user] = [...ctx.users.items.values()]
  return { ...ctx, user: user!, dashboard: ctx.deps.useCases.getDashboard }
}

/** Deixa as promessas pendentes (a atualização por trás) terminarem. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20))

describe('GetDashboard: responde na hora e atualiza por trás', () => {
  it('dentro de 1 minuto, serve o guardado sem buscar', async () => {
    const { dashboard, user, githubWork, clock } = await githubUser()
    await dashboard.execute(user)
    clock.advance(FRESH_MS - 1)
    const result = await dashboard.execute(user)
    expect(result.stale).toBe(false)
    expect(githubWork.calls).toHaveLength(1)
  })

  it('passado 1 minuto, responde com o guardado e busca um novo por trás', async () => {
    const { dashboard, user, githubWork, clock } = await githubUser()
    const first = await dashboard.execute(user)
    clock.advance(FRESH_MS + 1000)

    const stale = await dashboard.execute(user)
    expect(stale.stale).toBe(true)
    expect(stale.snapshot.fetchedAt).toEqual(first.snapshot.fetchedAt)

    await settle()
    expect(githubWork.calls).toHaveLength(2)
    const fresh = await dashboard.execute(user)
    expect(fresh.stale).toBe(false)
    expect(fresh.snapshot.fetchedAt.getTime()).toBeGreaterThan(first.snapshot.fetchedAt.getTime())
  })

  it('várias abas ao mesmo tempo disparam uma busca só', async () => {
    const { dashboard, user, githubWork, clock } = await githubUser()
    await dashboard.execute(user)
    clock.advance(FRESH_MS + 1000)
    githubWork.delayMs = 10

    await Promise.all([dashboard.execute(user), dashboard.execute(user), dashboard.execute(user)])
    await settle()
    expect(githubWork.calls).toHaveLength(2)
  })

  it('guardado há mais de 24 h: espera o GitHub em vez de mostrar algo tão velho', async () => {
    const { dashboard, user, githubWork, clock } = await githubUser()
    await dashboard.execute(user)
    clock.advance(MAX_STALE_MS + 1)
    const result = await dashboard.execute(user)
    expect(result.stale).toBe(false)
    expect(githubWork.calls).toHaveLength(2)
  })

  it('atualizar agora ignora o guardado', async () => {
    const { dashboard, user, githubWork } = await githubUser()
    await dashboard.execute(user)
    const result = await dashboard.execute(user, { refresh: true })
    expect(result.stale).toBe(false)
    expect(githubWork.calls).toHaveLength(2)
  })

  it('se a busca por trás falhar, o guardado continua valendo e tenta de novo depois de um tempo', async () => {
    const { dashboard, user, githubWork, clock } = await githubUser()
    await dashboard.execute(user)
    clock.advance(FRESH_MS + 1000)
    githubWork.error = upstream('fora do ar')

    await expect(dashboard.execute(user)).resolves.toMatchObject({ stale: true })
    await settle()

    // Logo depois da falha: serve o guardado sem pedir ao GitHub de novo.
    githubWork.error = null
    await expect(dashboard.execute(user)).resolves.toMatchObject({ stale: false })
    expect(githubWork.calls).toHaveLength(2)

    clock.advance(RETRY_AFTER_FAILURE_MS)
    await expect(dashboard.execute(user)).resolves.toMatchObject({ stale: true })
    await settle()
    expect(githubWork.calls).toHaveLength(3)
  })

  it('token recusado na busca por trás: a próxima requisição pede reconexão, sem esconder atrás de dado velho', async () => {
    const { dashboard, user, githubWork, clock } = await githubUser()
    await dashboard.execute(user)
    clock.advance(FRESH_MS + 1000)
    githubWork.error = githubReconnect()

    await dashboard.execute(user)
    await settle()
    await expect(dashboard.execute(user)).rejects.toMatchObject({ code: 'GITHUB_RECONNECT' })
  })

  it('o retrato fica guardado no cache para a próxima vez', async () => {
    const { dashboard, user, snapshotCache } = await githubUser()
    await dashboard.execute(user)
    const credential = createHash('sha256').update('gho_token_de_teste').digest('hex').slice(0, 16)
    await expect(snapshotCache.get(user.id, credential)).resolves.toBeDefined()
  })
})
