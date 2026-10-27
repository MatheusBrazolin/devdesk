import { describe, expect, it } from 'vitest'
import { tokenAlert } from './token-health'

const now = new Date('2026-10-27T12:00:00Z')
const ok = (expiresAt: string | null) => ({
  ok: true as const,
  source: 'personal' as const,
  expiresAt,
  organizations: [],
  rateLimit: null,
})

describe('tokenAlert', () => {
  it('não avisa sem validade, longe do vencimento ou na demonstração', () => {
    expect(tokenAlert(ok(null), now)).toEqual({ kind: 'none' })
    expect(tokenAlert(ok('2026-11-20T12:00:00Z'), now)).toEqual({ kind: 'none' })
    expect(tokenAlert(null, now)).toEqual({ kind: 'none' })
  })

  it('avisa na última semana, contando os dias', () => {
    expect(tokenAlert(ok('2026-11-01T12:00:00Z'), now)).toEqual({
      kind: 'expiring',
      days: 5,
      source: 'personal',
    })
    expect(tokenAlert(ok('2026-10-27T18:00:00Z'), now)).toMatchObject({ days: 1 })
  })

  it('token recusado pelo GitHub é recusado, venha de onde vier', () => {
    expect(tokenAlert({ ok: false, source: 'server' }, now)).toEqual({
      kind: 'refused',
      source: 'server',
    })
  })
})
