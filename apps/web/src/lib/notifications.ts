import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'

/**
 * Avisos do DevDesk. Sempre aparecem dentro da página; com as notificações
 * ligadas e a aba em segundo plano, também vão para o sistema. Ligar é
 * escolha da pessoa (menu do usuário), e só então o navegador pede permissão.
 */

const STORAGE_KEY = 'devdesk:notificacoes'

export type NotificationPermissionState = NotificationPermission | 'unsupported'

const supported = () => typeof window !== 'undefined' && 'Notification' in window

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())

function readOptIn(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'on'
  } catch {
    return false
  }
}

function writeOptIn(on: boolean) {
  try {
    if (on) localStorage.setItem(STORAGE_KEY, 'on')
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sem armazenamento (aba privada): vale só até recarregar.
  }
}

export function notificationPermission(): NotificationPermissionState {
  return supported() ? Notification.permission : 'unsupported'
}

/** Ligadas de verdade: a pessoa escolheu e o navegador deixou. */
export function notificationsEnabled(): boolean {
  return readOptIn() && notificationPermission() === 'granted'
}

/** Pede a permissão (só aqui, por um clique) e liga. Devolve se ficou ligado. */
export async function enableNotifications(): Promise<boolean> {
  if (!supported()) return false
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission
  writeOptIn(permission === 'granted')
  emit()
  return permission === 'granted'
}

export function disableNotifications() {
  writeOptIn(false)
  emit()
}

/** Estado para a interface: muda junto em todo lugar que mostra o interruptor. */
export function useNotificationsSetting() {
  const enabled = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    notificationsEnabled,
    () => false,
  )
  return { enabled, permission: notificationPermission() }
}

interface Notice {
  title: string
  body?: string
  /** Abre ao clicar na notificação do sistema (o PR no GitHub, por exemplo). */
  url?: string
  /** Mesmo tag, mesma notificação: o sistema substitui em vez de empilhar. */
  tag?: string
}

export function notify({ title, body, url, tag }: Notice) {
  toast(title, {
    description: body,
    duration: 15_000,
    ...(url && { action: { label: 'Abrir', onClick: () => window.open(url, '_blank') } }),
  })
  if (!notificationsEnabled() || document.visibilityState === 'visible') return
  try {
    const notification = new Notification(title, { body, tag, icon: '/favicon.svg' })
    notification.onclick = () => {
      window.focus()
      if (url) window.open(url, '_blank')
      notification.close()
    }
  } catch {
    // Alguns navegadores só criam notificação pelo service worker: fica o aviso na página.
  }
}
