import { describe, expect, it } from 'vitest'
import { FakeClock } from '../../../test/helpers.js'
import { GitHubOAuthClient } from './github-oauth-client.js'

const clock = new FakeClock(new Date('2026-10-23T12:00:00Z'))

function clientReturning(status: number, body: unknown) {
  const requests: Record<string, unknown>[] = []
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    requests.push(JSON.parse(String(init.body)))
    return new Response(JSON.stringify(body), { status })
  }) as unknown as typeof fetch
  const client = new GitHubOAuthClient({
    clientId: 'Ov23liTESTE',
    clientSecret: 'segredo',
    redirectUri: 'http://localhost:5173/api/auth/github/callback',
    clock,
    fetch: fetchImpl,
  })
  return { client, requests }
}

describe('GitHubOAuthClient', () => {
  it('lê as validades dos tokens que expiram', async () => {
    const { client } = clientReturning(200, {
      access_token: 'ghu_a',
      expires_in: 28800,
      refresh_token: 'ghr_r',
      refresh_token_expires_in: 15897600,
    })
    const tokens = await client.exchangeCode('code')
    expect(tokens).toEqual({
      accessToken: 'ghu_a',
      accessTokenExpiresAt: new Date('2026-10-23T20:00:00Z'),
      refreshToken: 'ghr_r',
      refreshTokenExpiresAt: new Date('2027-04-25T12:00:00Z'),
    })
  })

  it('token sem validade fica sem data e sem refresh', async () => {
    const { client } = clientReturning(200, { access_token: 'gho_a' })
    await expect(client.exchangeCode('code')).resolves.toEqual({
      accessToken: 'gho_a',
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    })
  })

  it('renova com grant_type=refresh_token e as credenciais do app', async () => {
    const { client, requests } = clientReturning(200, { access_token: 'ghu_b', expires_in: 28800 })
    await client.refreshTokens('ghr_r')
    expect(requests[0]).toEqual({
      client_id: 'Ov23liTESTE',
      client_secret: 'segredo',
      grant_type: 'refresh_token',
      refresh_token: 'ghr_r',
    })
  })

  it('refresh recusado pede reconexão', async () => {
    const { client } = clientReturning(200, { error: 'bad_refresh_token' })
    await expect(client.refreshTokens('ghr_r')).rejects.toMatchObject({ code: 'GITHUB_RECONNECT' })
  })

  it('credenciais do app erradas viram falha de upstream com o motivo', async () => {
    const { client } = clientReturning(200, {
      error: 'incorrect_client_credentials',
      error_description: 'The client_id and/or client_secret passed are incorrect.',
    })
    await expect(client.exchangeCode('code')).rejects.toThrow(/client_secret passed are incorrect/)
  })
})
