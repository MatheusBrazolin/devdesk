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

  it('modo pessoal desliga atrás de proxy, onde o IP local pode ser forjado', () => {
    const env = loadEnv({
      TOKEN_ENCRYPTION_KEY: TEST_KEY,
      GITHUB_PERSONAL_TOKEN: 'ghp_x',
      TRUST_PROXY: '1',
    })
    expect(env.personalTokenEnabled).toBe(false)
  })

  it('no Render, o endereço público vem do próprio Render', () => {
    const env = loadEnv({
      TOKEN_ENCRYPTION_KEY: TEST_KEY,
      RENDER_EXTERNAL_URL: 'https://devdesk-x1y2.onrender.com/',
    })
    expect(env.WEB_ORIGIN).toBe('https://devdesk-x1y2.onrender.com')
    expect(env.API_PUBLIC_URL).toBe('https://devdesk-x1y2.onrender.com/api')
  })

  it('endereço explícito vence o do Render', () => {
    const env = loadEnv({
      TOKEN_ENCRYPTION_KEY: TEST_KEY,
      RENDER_EXTERNAL_URL: 'https://devdesk.onrender.com',
      WEB_ORIGIN: 'https://devdesk.exemplo.dev',
    })
    expect(env.WEB_ORIGIN).toBe('https://devdesk.exemplo.dev')
  })

  it('explica o que está errado', () => {
    expect(() => loadEnv({ TOKEN_ENCRYPTION_KEY: 'curta' })).toThrow(/TOKEN_ENCRYPTION_KEY/)
  })
})
