import type { AttentionItem, AttentionReason } from './attention.js'

/**
 * Avisos com o app fechado (Web Push). O servidor compara o que pede atenção
 * agora com o que já avisou e manda só o que é novo, como o app faz aberto.
 */

export type PushLanguage = 'pt-BR' | 'en'

/** Idioma e fuso de quem se inscreveu: com o app fechado, não há front para traduzir. */
export interface PushLocale {
  language: PushLanguage
  timeZone: string
}

export const DEFAULT_PUSH_LOCALE: PushLocale = {
  language: 'pt-BR',
  timeZone: 'America/Sao_Paulo',
}

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
  /** Nulos nas inscrições de antes: valem português e o horário de Brasília. */
  language?: PushLanguage | null
  timeZone?: string | null
}

/** Fuso IANA que o Intl conhece ("America/Sao_Paulo", "Europe/Lisbon"). */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export function pushLocale(
  subscription: Pick<PushSubscription, 'language' | 'timeZone'>,
): PushLocale {
  return {
    language: subscription.language === 'en' ? 'en' : DEFAULT_PUSH_LOCALE.language,
    timeZone:
      subscription.timeZone && isValidTimeZone(subscription.timeZone)
        ? subscription.timeZone
        : DEFAULT_PUSH_LOCALE.timeZone,
  }
}

export interface PushNotice {
  title: string
  body: string
  url: string
  /** Mesma etiqueta do aviso do app aberto: o sistema troca um pelo outro, sem duplicar. */
  tag: string
}

/**
 * O servidor faz POST no endpoint que o navegador entregou. Só serviços de push
 * conhecidos: um endpoint inventado não vira um jeito de usar o DevDesk contra outra rede.
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
]

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return false
  }
  return (
    url.protocol === 'https:' &&
    !url.port &&
    !url.username &&
    PUSH_HOSTS.some((host) => host.test(url.hostname))
  )
}

/** Mesmas chaves do app aberto (attention-notices.ts no front). */
export const attentionKey = (item: AttentionItem) => `${item.reason}:${item.pullRequest.id}`
export const overdueKey = (item: AttentionItem) => `atrasada:${item.pullRequest.id}`

const ALL_KINDS: ReadonlySet<string> = new Set([
  'review_requested',
  'changes_requested',
  'ci_failed',
  'conflict',
  'ready_to_merge',
  'overdue_review',
  'agenda',
])

export const OVERDUE_AFTER_HOURS = 24
/** Mais que isso de uma vez vira um aviso só, em vez de uma pilha. */
export const MAX_SEPARATE = 3
/** O agendador roda a cada 10 minutos: avisa o que começa nos próximos 15. */
export const UPCOMING_MINUTES = 15

export interface UpcomingEvent {
  id: string
  title: string
  startsAt: Date
  calendar: string | null
}

/** Os textos do aviso nos dois idiomas do app. */
const TEXT = {
  'pt-BR': {
    reasons: {
      review_requested: 'Review pedida',
      changes_requested: 'Mudanças pedidas',
      ci_failed: 'CI falhou',
      conflict: 'Conflito',
      ready_to_merge: 'Pronto para merge',
    } satisfies Record<AttentionReason, string>,
    startsAt: (time: string, title: string) => `Às ${time}: ${title}`,
    inCalendar: (calendar: string) => `Na agenda ${calendar}`,
    ownCalendar: 'No seu calendário do DevDesk',
    overdue: (ref: string) => `Review esperando há mais de ${OVERDUE_AFTER_HOURS} h: ${ref}`,
    many: (count: number) => `${count} itens novos pedem sua atenção`,
  },
  en: {
    reasons: {
      review_requested: 'Review requested',
      changes_requested: 'Changes requested',
      ci_failed: 'CI failed',
      conflict: 'Conflict',
      ready_to_merge: 'Ready to merge',
    } satisfies Record<AttentionReason, string>,
    startsAt: (time: string, title: string) => `At ${time}: ${title}`,
    inCalendar: (calendar: string) => `In the ${calendar} calendar`,
    ownCalendar: 'In your DevDesk calendar',
    overdue: (ref: string) => `Review waiting for over ${OVERDUE_AFTER_HOURS} h: ${ref}`,
    many: (count: number) => `${count} new items need your attention`,
  },
} as const

/** Hora no idioma e no fuso de quem recebe: 14:10 em português, 2:10 PM em inglês. */
function timeFormat({ language, timeZone }: PushLocale): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'pt-BR', {
    hour: language === 'en' ? 'numeric' : '2-digit',
    minute: '2-digit',
    timeZone,
  })
}

function isOverdue(item: AttentionItem, now: Date): boolean {
  if (item.reason !== 'review_requested') return false
  const since = item.pullRequest.reviewRequestedAt ?? item.pullRequest.createdAt
  return now.getTime() - since.getTime() >= OVERDUE_AFTER_HOURS * 3_600_000
}

export interface PushRound {
  /** Tudo o que está valendo agora: vira o "já avisado" da próxima rodada. */
  keys: string[]
  notices: PushNotice[]
}

/**
 * Os avisos novos desta rodada. Sem rodada anterior (seen nulo), só anota:
 * quem liga os avisos não recebe de uma vez tudo o que já estava lá.
 */
export function pushRound(
  seen: ReadonlySet<string> | null,
  attention: AttentionItem[],
  events: UpcomingEvent[],
  now: Date,
  webOrigin: string,
  /** Tipos de aviso ligados nas configurações. Os desligados entram nas chaves, mas não avisam. */
  enabled: ReadonlySet<string> = ALL_KINDS,
  /** As chaves não mudam com o idioma: só o texto e a hora dos avisos. */
  locale: PushLocale = DEFAULT_PUSH_LOCALE,
): PushRound {
  const overdue = attention.filter((item) => isOverdue(item, now))
  const soon = events.filter((event) => {
    const minutes = (event.startsAt.getTime() - now.getTime()) / 60_000
    return minutes > 0 && minutes <= UPCOMING_MINUTES
  })
  const eventKey = (event: UpcomingEvent) => `agenda:${event.id}:${event.startsAt.toISOString()}`
  const keys = [...attention.map(attentionKey), ...overdue.map(overdueKey), ...soon.map(eventKey)]
  if (!seen) return { keys, notices: [] }

  const notices: PushNotice[] = []
  const text = TEXT[locale.language]
  const time = timeFormat(locale)
  const on = (kind: string) => enabled.has(kind)
  for (const event of soon.filter((e) => on('agenda') && !seen.has(eventKey(e)))) {
    notices.push({
      title: text.startsAt(time.format(event.startsAt), event.title),
      body: event.calendar ? text.inCalendar(event.calendar) : text.ownCalendar,
      url: `${webOrigin}/calendario`,
      tag: eventKey(event),
    })
  }
  for (const item of overdue.filter(
    (entry) => on('overdue_review') && !seen.has(overdueKey(entry)),
  )) {
    const pr = item.pullRequest
    notices.push({
      title: text.overdue(`${pr.repository}#${pr.number}`),
      body: pr.title,
      url: pr.url,
      tag: overdueKey(item),
    })
  }

  const fresh = attention.filter((item) => on(item.reason) && !seen.has(attentionKey(item)))
  if (fresh.length > MAX_SEPARATE) {
    notices.push({
      title: text.many(fresh.length),
      body: fresh
        .map(
          (item) =>
            `${text.reasons[item.reason]}: ${item.pullRequest.repository}#${item.pullRequest.number}`,
        )
        .join(' · '),
      url: webOrigin,
      tag: 'atencao',
    })
  } else {
    for (const item of fresh) {
      const pr = item.pullRequest
      notices.push({
        title: `${text.reasons[item.reason]}: ${pr.repository}#${pr.number}`,
        body: pr.title,
        url: pr.url,
        tag: attentionKey(item),
      })
    }
  }
  return { keys, notices }
}
