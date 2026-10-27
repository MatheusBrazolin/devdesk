import { useEffect, useState, useSyncExternalStore } from 'react'
import { t } from '@/lib/i18n'
import { holdNonUrgentWhile, notify, releaseHeld } from '@/lib/notifications'

/**
 * Cronômetro do modo foco. O estado guarda quando termina (não quanto
 * falta), então trocar de página, recarregar ou deixar a aba no fundo não o
 * atrasa. Fica no navegador: é uma conveniência de quem está usando.
 */

export const DURATIONS = [25, 50] as const
export type Minutes = (typeof DURATIONS)[number]

export type TimerState =
  | { status: 'idle'; minutes: Minutes }
  | { status: 'running'; minutes: Minutes; endsAt: number }
  | { status: 'paused'; minutes: Minutes; remainingMs: number }

const MINUTE = 60_000

export const initialTimer: TimerState = { status: 'idle', minutes: 25 }

export function remainingMs(state: TimerState, now: number): number {
  // O teto evita mostrar mais que a duração quando o relógio da tela ainda não andou.
  if (state.status === 'running')
    return Math.min(state.minutes * MINUTE, Math.max(0, state.endsAt - now))
  if (state.status === 'paused') return state.remainingMs
  return state.minutes * MINUTE
}

export const progress = (state: TimerState, now: number) =>
  1 - remainingMs(state, now) / (state.minutes * MINUTE)

export function start(state: TimerState, now: number): TimerState {
  return { status: 'running', minutes: state.minutes, endsAt: now + remainingMs(state, now) }
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== 'running') return state
  return { status: 'paused', minutes: state.minutes, remainingMs: remainingMs(state, now) }
}

export const reset = (state: TimerState): TimerState => ({ status: 'idle', minutes: state.minutes })

/** Trocar a duração só vale parado: no meio de um ciclo, mudaria a regra do jogo. */
export function choose(state: TimerState, minutes: Minutes): TimerState {
  return state.status === 'idle' ? { status: 'idle', minutes } : state
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const minutes = Math.floor(total / 60)
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// Armazenamento: um valor só, compartilhado por quem mostra e por quem avisa.

const STORAGE_KEY = 'devdesk:foco'
const listeners = new Set<() => void>()
let cached: TimerState | null = null

function load(): TimerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as TimerState) : null
    return parsed && DURATIONS.includes(parsed.minutes) ? parsed : initialTimer
  } catch {
    return initialTimer
  }
}

export function getTimer(): TimerState {
  cached ??= load()
  return cached
}

export function setTimer(next: TimerState) {
  cached = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Sem armazenamento: o cronômetro vale até recarregar.
  }
  listeners.forEach((listener) => listener())
}

export function useTimer(): TimerState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getTimer,
    () => initialTimer,
  )
}

/** Relógio que anda de segundo em segundo enquanto o cronômetro corre. */
export function useNow(running: boolean, everyMs = 250): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(id)
  }, [running, everyMs])
  // Parado ou pausado, o que falta não depende da hora: o valor velho serve.
  return now
}

/**
 * Avisa no fim do ciclo, em qualquer página do app. Fica no layout, não na
 * página do foco: sair do foco não cancela o aviso.
 */
// Com um bloco correndo, avisos que não são urgentes esperam o fim.
holdNonUrgentWhile(() => getTimer().status === 'running')

export function useFocusAlarm(): void {
  const timer = useTimer()
  useEffect(() => {
    // Terminou, pausou ou zerou: o que ficou segurado chega agora, num aviso só.
    if (timer.status !== 'running') return releaseHeld()
    const id = setTimeout(
      () => {
        setTimer(reset(timer))
        notify({
          title: t('Fim do bloco de foco'),
          body: t('{n} minutos concluídos. Hora de uma pausa.', { n: timer.minutes }),
          tag: 'foco',
          urgent: true,
        })
      },
      Math.max(0, timer.endsAt - Date.now()),
    )
    return () => clearTimeout(id)
  }, [timer])
}
