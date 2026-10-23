import { describe, expect, it } from 'vitest'
import { createTestContext } from '../../../test/helpers.js'
import { AppError } from '../../domain/errors.js'

async function githubUser() {
  const ctx = createTestContext()
  await ctx.deps.github!.completeLogin.execute('bom')
  const [user] = [...ctx.users.items.values()]
  return { ...ctx, user: user! }
}

describe('GetDashboard', () => {
  it('usuário demo recebe dados de exemplo, sem tocar no GitHub', async () => {
    const { deps, githubWork } = createTestContext()
    const { token } = await deps.useCases.startDemoSession.execute()
    const user = await deps.useCases.getCurrentUser.execute(token)

    const { snapshot, attention } = await deps.useCases.getDashboard.execute(user)

    expect(snapshot.isSample).toBe(true)
    expect(attention.length).toBeGreaterThan(0)
    expect(githubWork.calls).toEqual([])
  })

  it('decifra o token guardado e passa para a fonte do GitHub', async () => {
    const { deps, user, githubWork } = await githubUser()
    await deps.useCases.getDashboard.execute(user)
    expect(githubWork.calls).toEqual(['gho_token_de_teste'])
  })

  it('serve do cache dentro da validade', async () => {
    const { deps, user, githubWork, clock } = await githubUser()
    await deps.useCases.getDashboard.execute(user)
    clock.advance(30_000)
    await deps.useCases.getDashboard.execute(user)
    expect(githubWork.calls).toHaveLength(1)
  })

  it('busca de novo quando o cache vence', async () => {
    const { deps, user, githubWork, clock } = await githubUser()
    await deps.useCases.getDashboard.execute(user)
    clock.advance(60_000)
    await deps.useCases.getDashboard.execute(user)
    expect(githubWork.calls).toHaveLength(2)
  })

  it('refresh ignora o cache', async () => {
    const { deps, user, githubWork } = await githubUser()
    await deps.useCases.getDashboard.execute(user)
    await deps.useCases.getDashboard.execute(user, { refresh: true })
    expect(githubWork.calls).toHaveLength(2)
  })

  it('trocar de credencial (ex.: OAuth → token pessoal) não serve o cache da anterior', async () => {
    const { deps, user, githubWork, githubTokens } = await githubUser()
    await deps.useCases.getDashboard.execute(user)

    await githubTokens.save(user.id, {
      accessToken: 'ghp_token_pessoal',
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    })
    await deps.useCases.getDashboard.execute(user)

    expect(githubWork.calls).toEqual(['gho_token_de_teste', 'ghp_token_pessoal'])
  })

  it('pede reconexão quando não há token guardado', async () => {
    const { deps, user, users } = await githubUser()
    users.tokens.delete(user.id)
    await expect(deps.useCases.getDashboard.execute(user)).rejects.toMatchObject({
      code: 'GITHUB_RECONNECT',
    })
  })

  it('não guarda no cache uma falha', async () => {
    const { deps, user, githubWork } = await githubUser()
    githubWork.error = new AppError('UPSTREAM', 'fora do ar')
    await expect(deps.useCases.getDashboard.execute(user)).rejects.toThrow('fora do ar')

    githubWork.error = null
    await deps.useCases.getDashboard.execute(user)
    expect(githubWork.calls).toHaveLength(2)
  })
})
