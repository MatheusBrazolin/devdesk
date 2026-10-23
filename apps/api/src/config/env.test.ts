import { describe, expect, it } from 'vitest'
import { TEST_KEY } from '../../test/helpers.js'
import { loadEnv } from './env.js'

describe('loadEnv', () => {
  it('aplica padrões de desenvolvimento', () => {
    const env = loadEnv({ TOKEN_ENCRYPTION_KEY: TEST_KEY })
    expect(env.PORT).toBe(3333)
    expect(env.DEMO_ENABLED).toBe(true)
    expect(env.githubLoginEnabled).toBe(false)
  })

  it('desliga o demo em produção por padrão', () => {
    const env = loadEnv({ TOKEN_ENCRYPTION_KEY: TEST_KEY, NODE_ENV: 'production' })
    expect(env.DEMO_ENABLED).toBe(false)
  })

  it('modo pessoal liga com o token, fora de produção', () => {
    const env = loadEnv({ TOKEN_ENCRYPTION_KEY: TEST_KEY, GITHUB_PERSONAL_TOKEN: 'ghp_x' })
    expect(env.personalTokenEnabled).toBe(true)
  })

  it('modo pessoal nunca liga em produção', () => {
    const env = loadEnv({
      TOKEN_ENCRYPTION_KEY: TEST_KEY,
      GITHUB_PERSONAL_TOKEN: 'ghp_x',
      NODE_ENV: 'production',
    })
    expect(env.personalTokenEnabled).toBe(false)
  })

  it('explica o que está errado', () => {
    expect(() => loadEnv({ TOKEN_ENCRYPTION_KEY: 'curta' })).toThrow(/TOKEN_ENCRYPTION_KEY/)
  })
})
