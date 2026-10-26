import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({ toast: vi.fn() }))

const load = async () => {
  vi.resetModules()
  const notifications = await import('./notifications')
  const { toast } = await import('sonner')
  return { ...notifications, toast: vi.mocked(toast) }
}

describe('proteção do foco', () => {
  afterEach(() => vi.clearAllMocks())

  it('com foco correndo, segura o que não é urgente e entrega num resumo', async () => {
    const { notify, holdNonUrgentWhile, releaseHeld, toast } = await load()
    let focusing = true
    holdNonUrgentWhile(() => focusing)

    notify({ title: 'Review pedida: a/b#1' })
    notify({ title: 'CI falhou: a/b#2' })
    notify({ title: 'Lembrete: daily', urgent: true })
    expect(toast.mock.calls.map((call) => call[0])).toEqual(['Lembrete: daily'])

    focusing = false
    releaseHeld()
    expect(toast).toHaveBeenLastCalledWith(
      'Enquanto você focava: 2 avisos',
      expect.objectContaining({ description: 'Review pedida: a/b#1 · CI falhou: a/b#2' }),
    )
  })

  it('sem foco, tudo chega na hora e não há resumo', async () => {
    const { notify, releaseHeld, toast } = await load()
    notify({ title: 'Review pedida: a/b#1' })
    releaseHeld()
    expect(toast).toHaveBeenCalledTimes(1)
  })
})
