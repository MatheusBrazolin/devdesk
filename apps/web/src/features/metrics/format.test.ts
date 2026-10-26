import { describe, expect, it } from 'vitest'
import { formatHours, weekLabel } from './format'

describe('formatHours', () => {
  it('minutos, horas e dias', () => {
    expect(formatHours(0.75)).toBe('45 min')
    expect(formatHours(6.2)).toBe('6 h')
    expect(formatHours(38.9)).toBe('1 d 15 h')
    expect(formatHours(48)).toBe('2 d')
    expect(formatHours(null)).toBe('—')
  })

  it('rótulo da semana pelo dia e mês da segunda', () => {
    expect(weekLabel('2026-09-07')).toBe('7/9')
  })
})
