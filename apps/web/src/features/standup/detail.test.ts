import { describe, expect, it } from 'vitest'
import { translateDetail, waitingDays } from './detail'

describe('translateDetail', () => {
  it('em português, devolve o que veio da API', () => {
    expect(translateDetail('há 9 dias')).toBe('há 9 dias')
    expect(translateDetail('de rafael-lima')).toBe('de rafael-lima')
    expect(translateDetail('pediu mudanças')).toBe('pediu mudanças')
    expect(translateDetail(null)).toBeNull()
  })

  it('acha os dias de espera', () => {
    expect(waitingDays('há 12 dias')).toBe(12)
    expect(waitingDays('aprovado')).toBeNull()
  })
})
