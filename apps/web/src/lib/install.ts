import { useSyncExternalStore } from 'react'

/**
 * "Instalar app": o Chrome avisa (beforeinstallprompt) quando o DevDesk pode
 * ser instalado. O aviso é guardado para o menu oferecer a instalação na
 * hora certa; no app já instalado, o botão não aparece.
 */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Sem o preventDefault o Chrome mostra o próprio aviso; aqui quem decide é o menu.
    event.preventDefault()
    deferred = event as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    emit()
  })
}

/** Rodando como app instalado (janela própria, sem barra do navegador). */
export const isInstalled = () =>
  typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches

export function useInstallPrompt() {
  const available = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => deferred !== null && !isInstalled(),
    () => false,
  )
  const install = async () => {
    if (!deferred) return false
    const prompt = deferred
    deferred = null
    emit()
    await prompt.prompt()
    return (await prompt.userChoice).outcome === 'accepted'
  }
  return { available, install }
}
