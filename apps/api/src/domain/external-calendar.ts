import { AppError } from './errors.js'

/** Quantas agendas externas cada pessoa pode assinar. */
export const MAX_SUBSCRIPTIONS = 5

/**
 * Só provedores conhecidos: o servidor busca a URL, então aceitar qualquer
 * endereço abriria a porta para alguém usar o DevDesk contra a rede interna (SSRF).
 */
const ALLOWED_HOSTS = [
  'calendar.google.com',
  'outlook.office365.com',
  'outlook.office.com',
  'outlook.live.com',
] as const

/** iCloud publica em p01-caldav.icloud.com, p02-…, e assim por diante. */
const ICLOUD_HOST = /^p\d{1,3}-caldav\.icloud\.com$/

export function isAllowedCalendarHost(host: string): boolean {
  const lower = host.toLowerCase()
  return (ALLOWED_HOSTS as readonly string[]).includes(lower) || ICLOUD_HOST.test(lower)
}

const invalid = (message: string) => new AppError('VALIDATION', message)

/**
 * Valida o endereço secreto da agenda. Aceita webcal:// (o que o iCloud e o
 * Outlook mostram) e devolve sempre https://.
 */
export function parseCalendarUrl(raw: string): URL {
  const text = raw.trim().replace(/^webcals?:\/\//i, 'https://')
  let url: URL
  try {
    url = new URL(text)
  } catch {
    throw invalid('Cole o endereço completo da agenda, começando com https://.')
  }
  if (url.protocol !== 'https:') throw invalid('O endereço da agenda precisa ser https://.')
  if (url.username || url.password || url.port) throw invalid('Endereço de agenda inválido.')
  if (!isAllowedCalendarHost(url.hostname)) {
    throw invalid('Por enquanto, só agendas do Google, do Outlook ou do iCloud.')
  }
  url.hash = ''
  return url
}

/** Nome do provedor, para mostrar sem expor o endereço secreto. */
export function calendarProvider(host: string): string {
  if (host === 'calendar.google.com') return 'Google Agenda'
  if (ICLOUD_HOST.test(host)) return 'iCloud'
  if (host.startsWith('outlook.')) return 'Outlook'
  return 'Exemplo do DevDesk'
}

interface OccurrenceBase {
  /** Único por ocorrência: o UID do evento mais o início. */
  id: string
  title: string
  location: string | null
}

/** Uma ocorrência de evento de agenda externa, já com as repetições expandidas. */
export type ExternalOccurrence = OccurrenceBase &
  (
    | { allDay: true; date: string; endDate: string | null }
    | { allDay: false; startsAt: Date; endsAt: Date | null }
  )

export interface ExternalCalendarEvents {
  calendarId: string
  calendar: string
  events: ExternalOccurrence[]
}

export interface CalendarSubscription {
  id: string
  userId: string
  name: string
  /** Só o host: o endereço completo é segredo e fica cifrado. */
  host: string
  createdAt: Date
}
