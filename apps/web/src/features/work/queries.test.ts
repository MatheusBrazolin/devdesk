import { describe, expect, it } from 'vitest'
import { POLL_HIDDEN_MS, POLL_VISIBLE_MS, pollInterval } from './queries'

describe('pollInterval', () => {
  it('pergunta logo de novo quando veio o retrato guardado', () => {
    expect(pollInterval(true, true)).toBe(3_000)
    expect(pollInterval(true, false)).toBe(3_000)
  })

  it('depois de uma falha, não insiste a cada 3 s', () => {
    expect(pollInterval(true, true, 1)).toBe(POLL_VISIBLE_MS)
  })

  it('a cada 30 s com a aba visível e mais devagar escondida', () => {
    expect(pollInterval(false, true)).toBe(POLL_VISIBLE_MS)
    expect(pollInterval(undefined, false)).toBe(POLL_HIDDEN_MS)
    expect(POLL_HIDDEN_MS).toBeGreaterThan(POLL_VISIBLE_MS)
  })
})
