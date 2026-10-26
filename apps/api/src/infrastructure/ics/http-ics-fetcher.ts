import type { IcsFetcher } from '../../application/ports/ics-fetcher.js'
import { isAllowedCalendarHost } from '../../domain/external-calendar.js'

const TIMEOUT_MS = 10_000
const MAX_BYTES = 5 * 1024 * 1024
const MAX_REDIRECTS = 3

/**
 * Baixa o .ics. Os redirecionamentos são seguidos à mão, um a um, e cada
 * destino passa pela mesma lista de hosts: um 302 não leva o servidor para fora dela.
 */
export class HttpIcsFetcher implements IcsFetcher {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async fetch(url: URL): Promise<string> {
    let current = url
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (current.protocol !== 'https:' || !isAllowedCalendarHost(current.hostname)) {
        throw new Error('endereço de agenda fora da lista permitida')
      }
      const response = await this.fetchImpl(current, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: 'text/calendar, */*;q=0.5', 'user-agent': 'DevDesk' },
      })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        await response.body?.cancel()
        if (!location) throw new Error('redirecionamento sem destino')
        current = new URL(location, current)
        continue
      }
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error(`a agenda respondeu ${response.status}`)
      }
      return readLimited(response)
    }
    throw new Error('redirecionamentos demais')
  }
}

async function readLimited(response: Response): Promise<string> {
  const declared = Number(response.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES) throw new Error('agenda grande demais')
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BYTES) {
      await reader.cancel()
      throw new Error('agenda grande demais')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}
