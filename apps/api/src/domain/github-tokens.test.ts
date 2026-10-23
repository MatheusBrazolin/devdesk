import { describe, expect, it } from 'vitest'
import { canRefresh, type GitHubTokens, needsRefresh } from './github-tokens.js'

const now = new Date('2026-10-23T12:00:00Z')
const at = (minutes: number) => new Date(now.getTime() + minutes * 60_000)

const tokens = (overrides: Partial<GitHubTokens> = {}): GitHubTokens => ({
  accessToken: 'ghu_a',
  accessTokenExpiresAt: at(60),
  refreshToken: 'ghr_r',
  refreshTokenExpiresAt: at(60 * 24 * 180),
  ...overrides,
})

describe('needsRefresh', () => {
  it('token com folga não precisa renovar', () => {
    expect(needsRefresh(tokens(), now)).toBe(false)
  })

  it('renova dentro da margem de 5 minutos', () => {
    expect(needsRefresh(tokens({ accessTokenExpiresAt: at(4) }), now)).toBe(true)
  })

  it('renova o que já expirou', () => {
    expect(needsRefresh(tokens({ accessTokenExpiresAt: at(-10) }), now)).toBe(true)
  })

  it('token que não expira nunca renova', () => {
    expect(needsRefresh(tokens({ accessTokenExpiresAt: null }), now)).toBe(false)
  })
})

describe('canRefresh', () => {
  it('precisa de um refresh token', () => {
    expect(canRefresh(tokens({ refreshToken: null }), now)).toBe(false)
  })

  it('refresh token vencido não serve', () => {
    expect(canRefresh(tokens({ refreshTokenExpiresAt: at(-1) }), now)).toBe(false)
  })

  it('refresh token válido serve', () => {
    expect(canRefresh(tokens(), now)).toBe(true)
  })
})
