import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from './use-autosave'

const note = (body: string) => ({
  id: '0b7e5a4c-3f0e-4d43-9a57-2f0f6f5d7c11',
  title: '',
  displayTitle: body,
  body,
  tags: [],
  pinned: false,
  links: [],
  createdAt: '2026-10-23T12:00:00.000Z',
  updatedAt: '2026-10-23T12:00:00.000Z',
})

type Call = { body: Record<string, unknown>; resolve: (response: Response) => void }

/** fetch que fica pendurado até o teste responder: dá para ver o que está em voo. */
function controlledFetch() {
  const calls: Call[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((resolve) =>
          calls.push({ body: JSON.parse(String(init.body)), resolve }),
        ),
    ),
  )
  const ok = (call: Call) =>
    act(async () =>
      call.resolve(new Response(JSON.stringify({ note: note(String(call.body.body ?? '')) }))),
    )
  const fail = (call: Call, status: number, code: string) =>
    act(async () =>
      call.resolve(new Response(JSON.stringify({ error: { code, message: 'x' } }), { status })),
    )
  return { calls, ok, fail }
}

let seq = 0
function setup() {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  // Cada teste usa uma nota diferente: o guardado de um não vaza para outro.
  const id = `nota-${++seq}`
  return renderHook(({ noteId }) => useAutosave(noteId), { wrapper, initialProps: { noteId: id } })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useAutosave', () => {
  it('junta a digitação e salva depois da pausa', async () => {
    const { calls } = controlledFetch()
    const { result } = setup()
    act(() => result.current.schedule({ body: 'o' }))
    act(() => result.current.schedule({ body: 'oi' }))
    expect(calls).toHaveLength(0)
    await act(async () => vi.advanceTimersByTime(700))
    expect(calls.map((c) => c.body)).toEqual([{ body: 'oi' }])
  })

  it('um envio por vez: o que foi digitado durante o envio sai depois, já juntado', async () => {
    const { calls, ok } = controlledFetch()
    const { result } = setup()
    act(() => result.current.schedule({ body: 'a' }))
    await act(async () => vi.advanceTimersByTime(700))
    act(() => result.current.schedule({ body: 'ab' }))
    act(() => result.current.schedule({ body: 'abc' }))
    await act(async () => vi.advanceTimersByTime(700))
    expect(calls).toHaveLength(1) // o segundo espera o primeiro voltar

    await ok(calls[0]!)
    expect(calls).toHaveLength(2)
    expect(calls[1]!.body).toEqual({ body: 'abc' })
  })

  it('campo recusado pela validação não volta para a fila nem trava os próximos', async () => {
    const { calls, fail } = controlledFetch()
    const { result } = setup()
    act(() => result.current.schedule({ tags: ['x'.repeat(40)] }))
    await act(async () => vi.advanceTimersByTime(700))
    await fail(calls[0]!, 400, 'VALIDATION')
    expect(result.current.state).toBe('error')
    expect(result.current.error).toMatch(/limite/)

    act(() => result.current.schedule({ body: 'segue' }))
    await act(async () => vi.advanceTimersByTime(700))
    expect(calls[1]!.body).toEqual({ body: 'segue' })
  })

  it('falha de rede guarda a mudança e tenta de novo sozinha', async () => {
    const { calls, fail, ok } = controlledFetch()
    const { result } = setup()
    act(() => result.current.schedule({ body: 'importante' }))
    await act(async () => vi.advanceTimersByTime(700))
    await fail(calls[0]!, 502, 'UPSTREAM')
    expect(result.current.state).toBe('error')

    await act(async () => vi.advanceTimersByTime(4_000))
    expect(calls[1]!.body).toEqual({ body: 'importante' })
    await ok(calls[1]!)
    expect(result.current.state).toBe('saved')
  })

  it('ao trocar de nota, o pendente é enviado na hora', async () => {
    const { calls } = controlledFetch()
    const { result, rerender } = setup()
    act(() => result.current.schedule({ body: 'antes de sair' }))
    rerender({ noteId: 'outra-nota' })
    await act(async () => {})
    expect(calls.map((c) => c.body)).toEqual([{ body: 'antes de sair' }])
  })
})
