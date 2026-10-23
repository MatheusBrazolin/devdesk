import { describe, expect, it } from 'vitest'
import {
  choose,
  formatClock,
  initialTimer,
  pause,
  progress,
  remainingMs,
  reset,
  start,
} from './focus-timer'

const MIN = 60_000

describe('cronômetro do foco', () => {
  it('começa com a duração inteira e corre pelo relógio', () => {
    const running = start(initialTimer, 0)
    expect(remainingMs(running, 0)).toBe(25 * MIN)
    expect(remainingMs(running, 10 * MIN)).toBe(15 * MIN)
    expect(remainingMs(running, 30 * MIN)).toBe(0)
  })

  it('pausa guarda o que falta e retoma de onde parou', () => {
    const paused = pause(start(initialTimer, 0), 5 * MIN)
    expect(remainingMs(paused, 99 * MIN)).toBe(20 * MIN)
    const resumed = start(paused, 100 * MIN)
    expect(remainingMs(resumed, 110 * MIN)).toBe(10 * MIN)
  })

  it('a duração só muda parado', () => {
    expect(choose(initialTimer, 50)).toEqual({ status: 'idle', minutes: 50 })
    const running = start(initialTimer, 0)
    expect(choose(running, 50)).toBe(running)
    expect(reset(running)).toEqual({ status: 'idle', minutes: 25 })
  })

  it('mostra minutos e segundos, arredondando o segundo para cima', () => {
    expect(formatClock(25 * MIN)).toBe('25:00')
    expect(formatClock(61_500)).toBe('01:02')
    expect(formatClock(0)).toBe('00:00')
    expect(progress(start(initialTimer, 0), 12.5 * MIN)).toBe(0.5)
  })
})
