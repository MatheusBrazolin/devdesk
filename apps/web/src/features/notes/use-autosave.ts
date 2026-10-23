import type { Note, UpdateNoteInput } from '@devdesk/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '@/lib/api'
import { applySavedNote, noteQuery, saveNote } from './queries'

export type SaveState = 'saved' | 'pending' | 'saving' | 'error'

const DELAY_MS = 700
const RETRY_MS = 4_000

/**
 * Mudanças que não chegaram ao servidor quando o editor saiu da tela (troca
 * de nota, outra página, rede caída). Ficam aqui, por nota, e são reenviadas
 * quando o editor daquela nota volta.
 */
const unsaved = new Map<string, UpdateNoteInput>()

const isEmpty = (changes: UpdateNoteInput) => Object.keys(changes).length === 0

/**
 * Salva uma nota depois de uma pausa na digitação, com três garantias:
 * - um envio por vez: o próximo espera o anterior, então respostas antigas
 *   nunca sobrescrevem o que foi digitado depois;
 * - um campo recusado pela API (validação) não volta para a fila, para não
 *   travar todos os salvamentos seguintes;
 * - o que não chegou ao servidor não se perde ao trocar de nota ou sair.
 */
export function useAutosave(noteId: string) {
  const queryClient = useQueryClient()
  const pending = useRef<UpdateNoteInput>(unsaved.get(noteId) ?? {})
  const sending = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<SaveState>(() => (unsaved.has(noteId) ? 'pending' : 'saved'))
  const [error, setError] = useState<string | null>(null)
  // Sempre a versão mais nova de send: usada por timers e pelos efeitos de saída.
  const sendRef = useRef<(options?: { keepalive?: boolean }) => Promise<void>>(async () => {})

  const send = useCallback(
    async (options: { keepalive?: boolean } = {}) => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = null
      // Já tem um envio em voo: quando ele voltar, manda o que juntou.
      if (sending.current || isEmpty(pending.current)) return

      const changes = pending.current
      pending.current = {}
      sending.current = true
      setState('saving')
      try {
        const note = await saveNote(noteId, changes, options)
        // Se algo foi digitado enquanto salvava, o cache mostra o salvo + o novo.
        applySavedNote(queryClient, { ...note, ...pending.current } as Note, changes)
        unsaved.delete(noteId)
        setError(null)
        setState(isEmpty(pending.current) ? 'saved' : 'pending')
      } catch (cause) {
        if (cause instanceof ApiRequestError && cause.code === 'VALIDATION') {
          // Reenviar o mesmo valor daria o mesmo erro: descarta e avisa.
          setError('Um campo passou do limite e não foi salvo. Ajuste e continue.')
        } else {
          pending.current = { ...changes, ...pending.current }
          unsaved.set(noteId, pending.current)
          setError('Não salvou. Vou tentar de novo.')
          timer.current = setTimeout(() => void sendRef.current(), RETRY_MS)
        }
        setState('error')
      } finally {
        sending.current = false
        if (!isEmpty(pending.current) && !timer.current) void sendRef.current()
      }
    },
    [noteId, queryClient],
  )

  const schedule = useCallback(
    (changes: UpdateNoteInput) => {
      pending.current = { ...pending.current, ...changes }
      unsaved.set(noteId, pending.current)
      // O cache acompanha a digitação: voltar a esta nota mostra o texto mais novo.
      queryClient.setQueryData<Note>(
        noteQuery(noteId).queryKey,
        (old) => old && { ...old, ...changes },
      )
      setState('pending')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => void send(), DELAY_MS)
    },
    [noteId, queryClient, send],
  )

  const flush = useCallback(() => void send(), [send])

  // Reenvia o que ficou de uma visita anterior a esta nota.
  useEffect(() => {
    if (!isEmpty(pending.current)) void send()
  }, [send])

  // Saindo do editor: envia na hora. O envio continua mesmo sem o componente.
  useEffect(() => {
    sendRef.current = send
  }, [send])
  useEffect(() => () => void sendRef.current(), [noteId])

  // Fechando a aba ou indo para o fundo (celular): keepalive o navegador não cancela.
  useEffect(() => {
    const leave = () => void sendRef.current({ keepalive: true })
    const onVisibility = () => document.visibilityState === 'hidden' && leave()
    window.addEventListener('pagehide', leave)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', leave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return { schedule, flush, state, error }
}
