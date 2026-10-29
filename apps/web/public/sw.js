// Service worker do DevDesk: o que faz o app instalável abrir rápido.
// - Arquivos do build (/assets/*) têm o hash no nome e nunca mudam: cache primeiro.
// - Páginas: sempre da rede, para nunca segurar versão velha (o aviso de versão
//   nova depende disso). Sem rede, abre a última página guardada.
// - /api/* nunca passa por aqui: são os dados da conta, sempre ao vivo.
const ASSETS = 'devdesk-assets-v1'
const SHELL = 'devdesk-shell-v1'
const KEEP = [ASSETS, SHELL]
const MAX_ASSETS = 80

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!KEEP.includes(key)) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request))
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
  }
})

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    await cache.put(request, response.clone())
    await trim(cache)
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL)
  try {
    const response = await fetch(request)
    if (response.ok) await cache.put('/', response.clone())
    return response
  } catch {
    return (
      (await cache.match('/')) ??
      new Response('<h1>Sem conexão</h1><p>O DevDesk volta quando a internet voltar.</p>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
        status: 503,
      })
    )
  }
}

// Avisos com o app fechado: o servidor manda { title, body, url, tag }, já no
// idioma de quem se inscreveu. O texto daqui é só para um aviso que chegue vazio.
const FALLBACK_BODY = self.navigator.language?.toLowerCase().startsWith('pt')
  ? 'Tem algo novo no seu painel.'
  : "There's something new on your dashboard."

self.addEventListener('push', (event) => {
  let notice = {}
  try {
    notice = event.data?.json() ?? {}
  } catch {
    // Conteúdo inesperado: mostra um aviso genérico em vez de nada.
  }
  event.waitUntil(
    self.registration.showNotification(notice.title ?? 'DevDesk', {
      body: notice.body || FALLBACK_BODY,
      tag: notice.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: notice.url ?? '/' },
    }),
  )
})

// Clicar no aviso: foca uma janela do DevDesk aberta ou abre o link.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    (async () => {
      const target = new URL(url, self.location.origin)
      if (target.origin === self.location.origin) {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        const open = windows.find((client) => new URL(client.url).origin === target.origin)
        if (open) {
          await open.focus()
          return open.navigate(target.href)
        }
      }
      return self.clients.openWindow(target.href)
    })(),
  )
})

/** Cada deploy traz arquivos novos: os mais antigos saem para o cache não crescer. */
async function trim(cache) {
  const keys = await cache.keys()
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key)
}
