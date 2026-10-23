import { describe, expect, it } from 'vitest'
import { formatRelative } from './time'

const now = new Date('2026-10-23T12:00:00Z')
const before = (ms: number) => new Date(now.getTime() - ms)
const MIN = 60_000

describe('formatRelative', () => {
  it.each([
    [30_000, 'agora'],
    [5 * MIN, 'há 5 min'],
    [59 * MIN, 'há 59 min'],
    [3 * 60 * MIN, 'há 3 h'],
    [26 * 60 * MIN, 'ontem'],
    [4 * 24 * 60 * MIN, 'há 4 dias'],
  ])('%i ms atrás vira "%s"', (ms, expected) => {
    expect(formatRelative(before(ms), now)).toBe(expected)
  })

  it('depois de um mês mostra a data', () => {
    expect(formatRelative(new Date('2026-09-01T12:00:00Z'), now)).toMatch(/1 de set/)
  })

  it('data no futuro (relógio adiantado) vira "agora"', () => {
    expect(formatRelative(new Date(now.getTime() + 5 * MIN), now)).toBe('agora')
  })
})
