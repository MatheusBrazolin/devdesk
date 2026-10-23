import type { UpdateNoteInput } from '@devdesk/shared'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useUpdateNote } from './queries'

export type SaveState = 'saved' | 'pending' | 'saving' | 'error'

const DELAY_MS = 700

/**
 * Junta as mudanças de uma nota e salva depois de uma pausa na digitação.
 * Ao trocar de nota ou sair da página, o que estiver pendente é salvo na hora.
 */
export function useAutosave(noteId: string) {
  const update = useUpdateNote()
  const pending = useRef<UpdateNoteInput>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<SaveState>('saved')

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const changes = pending.current
    if (Object.keys(changes).length === 0) return
    pending.current = {}
    setState('saving')
    update.mutate(
      { id: noteId, changes },
      {
        onSuccess: () => setState(Object.keys(pending.current).length ? 'pending' : 'saved'),
        onError: () => {
          // Devolve o que falhou para a fila: a próxima edição tenta de novo.
          pending.current = { ...changes, ...pending.current }
          setState('error')
        },
      },
    )
  }, [noteId, update])

  const schedule = useCallback(
    (changes: UpdateNoteInput) => {
      pending.current = { ...pending.current, ...changes }
      setState('pending')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, DELAY_MS)
    },
    [flush],
  )

  // Salva o que ficou pendente ao trocar de nota ou desmontar.
  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  }, [flush])
  useEffect(() => () => flushRef.current(), [noteId])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length === 0) return
      flushRef.current()
      event.preventDefault()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  return { schedule, flush, state }
}
