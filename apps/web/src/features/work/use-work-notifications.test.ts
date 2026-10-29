import { describe, expect, it } from 'vitest'
import { mergeSeen, readSeen } from './use-work-notifications'

const DAY = 24 * 60 * 60 * 1000

describe('itens já avisados', () => {
  it('soma em vez de trocar: o que some numa rodada não volta como novo', () => {
    const first = mergeSeen(null, ['a', 'b'], 0)
    const second = mergeSeen(first, ['a'], 1_000)
    expect(Object.keys(second).sort()).toEqual(['a', 'b'])
  })

  it('esquece depois de uma semana sem aparecer', () => {
    const seen = mergeSeen(null, ['velho'], 0)
    expect(mergeSeen(seen, ['novo'], 8 * DAY)).toEqual({ novo: 8 * DAY })
  })

  it('lê o formato antigo (lista de chaves)', () => {
    expect(readSeen('["a","b"]', 5)).toEqual({ a: 5, b: 5 })
    expect(readSeen(null, 5)).toBeNull()
    expect(readSeen('{quebrado', 5)).toBeNull()
  })
})
