import { describe, expect, it } from 'vitest'
import { parseTokenExpiration } from './token-expiration.js'

describe('parseTokenExpiration', () => {
  it('lê os dois formatos que o GitHub manda', () => {
    expect(parseTokenExpiration('2026-11-26 17:00:00 UTC')?.toISOString()).toBe(
      '2026-11-26T17:00:00.000Z',
    )
    expect(parseTokenExpiration('2026-11-26 17:00:00 -0300')?.toISOString()).toBe(
      '2026-11-26T20:00:00.000Z',
    )
  })

  it('sem cabeçalho ou formato estranho vira nulo', () => {
    expect(parseTokenExpiration(null)).toBeNull()
    expect(parseTokenExpiration('amanhã')).toBeNull()
  })
})
