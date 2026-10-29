import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { plural, t } from './i18n'

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
  /** Chega mesmo durante o foco (lembrete da agenda, fim do bloco). */
  urgent?: boolean
}

// Proteção do foco: com um bloco correndo, o que não é urgente espera o fim.
let holdWhile: () => boolean = () => false
const held: Notice[] = []
const heldListeners = new Set<() => void>()
const emitHeld = () => heldListeners.forEach((listener) => listener())

/** Quem decide quando segurar (o cronômetro do foco). */
export function holdNonUrgentWhile(predicate: () => boolean) {
  holdWhile = predicate
}

/** Entrega o que ficou segurado num aviso só ("enquanto você focava"). */
export function releaseHeld() {
  if (held.length === 0) return
  const notices = held.splice(0)
  emitHeld()
  notify({
    title: plural(
      notices.length,
      'Enquanto você focava: {n} aviso',
      'Enquanto você focava: {n} avisos',
    ),
    body: notices.map((notice) => notice.title).join(' · '),
    tag: 'foco-resumo',
    urgent: true,
  })
}

/** Quantos avisos estão esperando o fim do foco. */
export function useHeldCount(): number {
  return useSyncExternalStore(
    (listener) => {
      heldListeners.add(listener)
      return () => heldListeners.delete(listener)
    },
    () => held.length,
    () => 0,
  )
}

export function notify(notice: Notice) {
  if (!notice.urgent && holdWhile()) {
    held.push(notice)
    emitHeld()
    return
  }
  const { title, body, url, tag } = notice
  toast(title, {
    description: body,
    duration: 15_000,
    ...(url && { action: { label: t('Abrir'), onClick: () => window.open(url, '_blank') } }),
  })
  // Janela visível mas atrás do editor também conta: o aviso na página ninguém vê.
  if (!notificationsEnabled() || document.hasFocus()) return
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
