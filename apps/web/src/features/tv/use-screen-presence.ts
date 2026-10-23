import { useEffect, useState } from 'react'

/**
 * Mantém a tela acesa enquanto o modo TV está aberto (Screen Wake Lock). O
 * navegador solta o pedido quando a aba some; ele é refeito quando ela volta.
 * Onde a API não existe, não faz nada: a TV usa o próprio desligamento.
 */
export function useWakeLock(): void {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let active = true
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
      } catch {
        // Recusado (economia de bateria, aba no fundo): segue sem.
      }
    }
    const onVisibility = () => {
      if (active && document.visibilityState === 'visible') void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisibility)
      void lock?.release()
    }
  }, [])
}

/** Verdadeiro depois de alguns segundos sem mexer o mouse ou tocar na tela. */
export function useIdle(afterMs = 3000): boolean {
  const [idle, setIdle] = useState(false)
  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), afterMs)
    const wake = () => {
      setIdle(false)
      clearTimeout(timer)
      timer = setTimeout(() => setIdle(true), afterMs)
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart'] as const
    events.forEach((event) => window.addEventListener(event, wake, { passive: true }))
    return () => {
      clearTimeout(timer)
      events.forEach((event) => window.removeEventListener(event, wake))
    }
  }, [afterMs])
  return idle
}

/** Tela cheia: estado atual e alternância (botão ou tecla F). */
export function useFullscreen() {
  const [on, setOn] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  )
  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }
  return { on, toggle, supported: typeof document !== 'undefined' && document.fullscreenEnabled }
}
