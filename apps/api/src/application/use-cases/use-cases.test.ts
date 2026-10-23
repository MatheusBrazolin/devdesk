import { describe, expect, it } from 'vitest'
import { createTestContext } from '../../../test/helpers.js'
import { SESSION_TTL_MS } from '../../domain/session.js'
import { DEMO_TTL_MS } from './start-demo-session.js'

describe('CompleteGitHubLogin', () => {
  it('cria o usuário, guarda o token cifrado e abre uma sessão', async () => {
    const { deps, users, cipher, sessions, tokens } = createTestContext()

    const session = await deps.github!.completeLogin.execute('bom')

    const [user] = [...users.items.values()]
    expect(user?.login).toBe('octocat')
    const stored = users.tokens.get(user!.id)!
    expect(cipher.decrypt(stored.accessToken)).toBe('gho_token_de_teste')
    expect(stored.accessToken).not.toContain('gho_')
    expect(sessions.items.has(tokens.hash(session.token))).toBe(true)
  })

  it('não duplica o usuário em logins seguidos', async () => {
    const { deps, users } = createTestContext()
    await deps.github!.completeLogin.execute('bom')
    await deps.github!.completeLogin.execute('bom')
    expect(users.items.size).toBe(1)
  })
})

describe('GetCurrentUser', () => {
  it('recusa quando não há token', async () => {
    const { deps } = createTestContext()
    await expect(deps.useCases.getCurrentUser.execute(undefined)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })

  it('nunca persiste o token puro, só o hash', async () => {
    const { deps, sessions } = createTestContext()
    const { token } = await deps.useCases.startDemoSession.execute()
    expect(sessions.items.has(token)).toBe(false)
  })

  it('expira a sessão depois do TTL e apaga o registro', async () => {
    const { deps, clock, sessions } = createTestContext()
    const { token } = await deps.useCases.startDemoSession.execute()

    await expect(deps.useCases.getCurrentUser.execute(token)).resolves.toMatchObject({
      isDemo: true,
    })

    clock.advance(SESSION_TTL_MS)
    await expect(deps.useCases.getCurrentUser.execute(token)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    expect(sessions.items.size).toBe(0)
  })
})

describe('StartDemoSession', () => {
  it('é recusado quando o modo demo está desligado', async () => {
    const { deps } = createTestContext({ demoEnabled: false })
    await expect(deps.useCases.startDemoSession.execute()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('cada visita ganha um usuário demo próprio', async () => {
    const { deps, users } = createTestContext()
    const first = await deps.useCases.startDemoSession.execute()
    const second = await deps.useCases.startDemoSession.execute()
    expect(users.items.size).toBe(2)
    const [a, b] = await Promise.all(
      [first, second].map((s) => deps.useCases.getCurrentUser.execute(s.token)),
    )
    expect(a!.id).not.toBe(b!.id)
  })

  it('a visita seguinte apaga as que passaram de 24 horas', async () => {
    const { deps, users, clock } = createTestContext()
    await deps.useCases.startDemoSession.execute()
    clock.advance(DEMO_TTL_MS + 1)
    await deps.useCases.startDemoSession.execute()
    expect(users.items.size).toBe(1)
  })
})

describe('Logout', () => {
  it('derruba a sessão', async () => {
    const { deps } = createTestContext()
    const { token } = await deps.useCases.startDemoSession.execute()
    await deps.useCases.logout.execute(token)
    await expect(deps.useCases.getCurrentUser.execute(token)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
  })
})
