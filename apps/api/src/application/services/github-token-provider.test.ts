import { describe, expect, it } from 'vitest'
import { createTestContext } from '../../../test/helpers.js'
import { githubReconnect } from '../../domain/errors.js'

const HOUR = 60 * 60 * 1000

/** Faz login com um app que emite tokens de 8 horas, como o GitHub padrão. */
async function loggedIn() {
  const ctx = createTestContext({ tokenExpiresInMs: 8 * HOUR })
  await ctx.deps.github!.completeLogin.execute('bom')
  const [user] = [...ctx.users.items.values()]
  return { ...ctx, userId: user!.id }
}

describe('GitHubTokenProvider', () => {
  it('guarda access e refresh token cifrados, com as validades', async () => {
    const { users, userId, cipher } = await loggedIn()
    const stored = users.tokens.get(userId)!
    expect(stored.refreshToken).not.toContain('ghr_')
    expect(cipher.decrypt(stored.refreshToken!)).toBe('ghr_1')
    expect(stored.accessTokenExpiresAt).toBeInstanceOf(Date)
  })

  it('devolve o token atual enquanto ele vale', async () => {
    const { githubTokens, userId, oauth, clock } = await loggedIn()
    clock.advance(7 * HOUR)
    await expect(githubTokens.getAccessToken(userId)).resolves.toBe('gho_token_de_teste')
    expect(oauth.refreshCalls).toEqual([])
  })

  it('renova perto de expirar e guarda os tokens novos', async () => {
    const { githubTokens, userId, oauth, clock, users, cipher } = await loggedIn()
    clock.advance(8 * HOUR - 60_000)

    await expect(githubTokens.getAccessToken(userId)).resolves.toBe('ghu_renovado_2')
    expect(oauth.refreshCalls).toEqual(['ghr_1'])
    expect(cipher.decrypt(users.tokens.get(userId)!.refreshToken!)).toBe('ghr_2')

    // A próxima leitura já usa o token novo, sem renovar de novo.
    await expect(githubTokens.getAccessToken(userId)).resolves.toBe('ghu_renovado_2')
    expect(oauth.refreshCalls).toHaveLength(1)
  })

  it('pedidos simultâneos renovam uma vez só (o refresh token só vale uma vez)', async () => {
    const { githubTokens, userId, oauth, clock } = await loggedIn()
    clock.advance(9 * HOUR)

    const results = await Promise.all([
      githubTokens.getAccessToken(userId),
      githubTokens.getAccessToken(userId),
      githubTokens.getAccessToken(userId),
    ])
    expect(new Set(results)).toEqual(new Set(['ghu_renovado_2']))
    expect(oauth.refreshCalls).toHaveLength(1)
  })

  it('refresh recusado pelo GitHub pede reconexão', async () => {
    const { githubTokens, userId, oauth, clock } = await loggedIn()
    clock.advance(9 * HOUR)
    oauth.refreshError = githubReconnect()
    await expect(githubTokens.getAccessToken(userId)).rejects.toMatchObject({
      code: 'GITHUB_RECONNECT',
    })
  })

  it('depois de uma falha, a próxima tentativa renova de novo', async () => {
    const { githubTokens, userId, oauth, clock } = await loggedIn()
    clock.advance(9 * HOUR)
    oauth.refreshError = new Error('rede caiu')
    await expect(githubTokens.getAccessToken(userId)).rejects.toThrow('rede caiu')

    oauth.refreshError = null
    await expect(githubTokens.getAccessToken(userId)).resolves.toBe('ghu_renovado_2')
  })

  it('refresh token vencido pede reconexão sem chamar o GitHub', async () => {
    const { githubTokens, userId, oauth, clock } = await loggedIn()
    clock.advance(181 * 24 * HOUR)
    await expect(githubTokens.getAccessToken(userId)).rejects.toMatchObject({
      code: 'GITHUB_RECONNECT',
    })
    expect(oauth.refreshCalls).toEqual([])
  })

  it('token que não expira é usado para sempre', async () => {
    const ctx = createTestContext()
    await ctx.deps.github!.completeLogin.execute('bom')
    const [user] = [...ctx.users.items.values()]
    ctx.clock.advance(365 * 24 * HOUR)
    await expect(ctx.githubTokens.getAccessToken(user!.id)).resolves.toBe('gho_token_de_teste')
  })
})
