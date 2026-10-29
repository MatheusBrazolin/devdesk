import { api } from './api'
import { LANGUAGE } from './i18n'

/**
 * Avisos com o app fechado (Web Push). Ligar as notificações também inscreve
 * este navegador no servidor, quando ele tem as chaves e o app está instalado
 * com o service worker. Sem isso, os avisos seguem só com o app aberto.
 */

const json = { 'content-type': 'application/json' }

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

/** A chave pública VAPID vem em base64url; o navegador quer os bytes. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

/**
 * O servidor monta o aviso sozinho, com o app fechado: precisa saber em que
 * idioma escrever e em que fuso mostrar a hora da reunião.
 */
function locale(): { language: string; timeZone?: string } {
  try {
    return { language: LANGUAGE, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }
  } catch {
    return { language: LANGUAGE }
  }
}

async function register(subscription: PushSubscription): Promise<void> {
  const { endpoint, keys } = subscription.toJSON()
  await api<void>('/push/subscriptions', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ endpoint, keys, ...locale() }),
  })
}

/** Verdadeiro se este navegador ficou inscrito para receber com o app fechado. */
export async function enablePush(): Promise<boolean> {
  try {
    const sw = await registration()
    if (!sw || Notification.permission !== 'granted') return false
    const { publicKey } = await api<{ publicKey: string | null }>('/push')
    if (!publicKey) return false
    const subscription =
      (await sw.pushManager.getSubscription()) ??
      (await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes(publicKey),
      }))
    await register(subscription)
    return true
  } catch {
    // Demonstração, servidor sem chaves ou navegador recusando: fica só o aviso com o app aberto.
    return false
  }
}

/**
 * Reenvia idioma e fuso de uma inscrição que já existe (trocou o idioma do app
 * ou viajou). Sem inscrição, não faz nada: quem liga os avisos é a pessoa.
 */
export async function syncPushLocale(): Promise<void> {
  try {
    const subscription = await (await registration())?.pushManager.getSubscription()
    if (subscription && Notification.permission === 'granted') await register(subscription)
  } catch {
    // Fica com o idioma e o fuso de antes; o próximo carregamento tenta de novo.
  }
}

export async function disablePush(): Promise<void> {
  try {
    const subscription = await (await registration())?.pushManager.getSubscription()
    if (!subscription) return
    await api<void>('/push/subscriptions', {
      method: 'DELETE',
      headers: json,
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    }).catch(() => undefined)
    await subscription.unsubscribe()
  } catch {
    // Sem service worker, não havia inscrição.
  }
}
