import type { Dashboard } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { isNewer } from './dashboard-sync'

const at = (fetchedAt: string) => ({ fetchedAt }) as Dashboard

describe('isNewer', () => {
  it('aba sem dados aceita o que chegar', () => {
    expect(isNewer(at('2026-10-26T14:00:00Z'), undefined)).toBe(true)
  })

  it('só aceita o que foi buscado depois', () => {
    expect(isNewer(at('2026-10-26T14:01:00Z'), at('2026-10-26T14:00:00Z'))).toBe(true)
    expect(isNewer(at('2026-10-26T13:59:00Z'), at('2026-10-26T14:00:00Z'))).toBe(false)
  })

  it('o mesmo retrato não é novidade (sem eco entre abas)', () => {
    expect(isNewer(at('2026-10-26T14:00:00Z'), at('2026-10-26T14:00:00Z'))).toBe(false)
  })
})
