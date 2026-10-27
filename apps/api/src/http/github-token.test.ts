import { gitHubTokenStatusSchema } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { cookieHeader, createTestApp } from '../../test/helpers.js'

/** Entra pelo OAuth falso, como qualquer pessoa no site publicado. */
async function signedInWithOAuth() {
  const ctx = await createTestApp()
  const start = await ctx.app.inject({ method: 'GET', url: '/api/auth/github' })
  const state = new URL(String(start.headers.location)).searchParams.get('state')!
  const callback = await ctx.app.inject({
    method: 'GET',
    url: `/api/auth/github/callback?code=bom&state=${state}`,
    headers: { cookie: cookieHeader(start.headers['set-cookie']) },
  })
  return { ...ctx, headers: { cookie: cookieHeader(callback.headers['set-cookie']) } }
}

const put = (token: string) => ({
  method: 'PUT' as const,
  url: '/api/github/token',
  payload: { token },
})

describe('token pessoal do GitHub', () => {
  it('sem token, os dados vêm do OAuth; com token, passam a vir dele', async () => {
    const { app, headers, githubWork } = await signedInWithOAuth()
    const initial = gitHubTokenStatusSchema.parse(
      (await app.inject({ url: '/api/github/token', headers })).json(),
    )
    expect(initial).toEqual({ connected: false, savedAt: null })

    await app.inject({ url: '/api/dashboard?refresh=true', headers })
    expect(githubWork.calls.at(-1)).toBe('gho_token_de_teste')

    const saved = await app.inject({ ...put('ghp_valido'), headers })
    expect(saved.statusCode).toBe(200)
    expect(saved.json()).toMatchObject({ connected: true })
    expect(saved.body).not.toContain('ghp_valido')

    await app.inject({ url: '/api/dashboard', headers })
    expect(githubWork.calls.at(-1)).toBe('ghp_valido')
  })

  it('fica cifrado no banco e sobrevive a um novo login', async () => {
    const { app, headers, users, githubWork } = await signedInWithOAuth()
    await app.inject({ ...put('ghp_valido'), headers })
    const [stored] = [...users.personalTokens.values()]
    expect(stored?.token).not.toContain('ghp_valido')

    const again = await signedInAgain(app)
    await app.inject({ url: '/api/dashboard?refresh=true', headers: again })
    expect(githubWork.calls.at(-1)).toBe('ghp_valido')
  })

  it('recusa token de outra conta, recusado pelo GitHub ou sem os escopos', async () => {
    const { app, headers, profiles } = await signedInWithOAuth()

    const other = await app.inject({ ...put('ghp_outra_pessoa'), headers })
    expect(other.statusCode).toBe(400)
    expect(other.json().error.message).toContain('@outra')

    const refused = await app.inject({ ...put('ghp_revogado'), headers })
    expect(refused.statusCode).toBe(400)
    expect(refused.json().error.message).toContain('recusou')

    const malformed = await app.inject({ ...put('não é token'), headers })
    expect(malformed.statusCode).toBe(400)

    profiles.scopes = ['repo']
    const scopes = await app.inject({ ...put('ghp_valido'), headers })
    expect(scopes.statusCode).toBe(400)
    expect(scopes.json().error.message).toContain('read:org')

    // Fine-grained não informa escopos: vale o que a pessoa marcou.
    profiles.scopes = null
    expect((await app.inject({ ...put('ghp_valido'), headers })).statusCode).toBe(200)
  })

  it('remover volta para o OAuth', async () => {
    const { app, headers, githubWork } = await signedInWithOAuth()
    await app.inject({ ...put('ghp_valido'), headers })
    const removed = await app.inject({ method: 'DELETE', url: '/api/github/token', headers })
    expect(removed.json()).toEqual({ connected: false, savedAt: null })

    await app.inject({ url: '/api/dashboard?refresh=true', headers })
    expect(githubWork.calls.at(-1)).toBe('gho_token_de_teste')
  })

  it('não existe no modo demonstração', async () => {
    const { app } = await createTestApp()
    const login = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const headers = { cookie: cookieHeader(login.headers['set-cookie']) }
    const res = await app.inject({ ...put('ghp_valido'), headers })
    expect(res.statusCode).toBe(403)
  })
})

/** Um segundo login pelo OAuth na mesma conta. */
async function signedInAgain(app: Awaited<ReturnType<typeof createTestApp>>['app']) {
  const start = await app.inject({ method: 'GET', url: '/api/auth/github' })
  const state = new URL(String(start.headers.location)).searchParams.get('state')!
  const callback = await app.inject({
    method: 'GET',
    url: `/api/auth/github/callback?code=bom&state=${state}`,
    headers: { cookie: cookieHeader(start.headers['set-cookie']) },
  })
  return { cookie: cookieHeader(callback.headers['set-cookie']) }
}
