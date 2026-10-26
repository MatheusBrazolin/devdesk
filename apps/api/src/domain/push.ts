import type { AttentionItem, AttentionReason } from './attention.js'

/**
 * Avisos com o app fechado (Web Push). O servidor compara o que pede atenção
 * agora com o que já avisou e manda só o que é novo, como o app faz aberto.
 */

export interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
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

const REASON_TEXT: Record<AttentionReason, string> = {
  review_requested: 'Review pedida',
  changes_requested: 'Mudanças pedidas',
  ci_failed: 'CI falhou',
  conflict: 'Conflito',
  ready_to_merge: 'Pronto para merge',
}

/** Mesmas chaves do app aberto (attention-notices.ts no front). */
export const attentionKey = (item: AttentionItem) => `${item.reason}:${item.pullRequest.id}`
export const overdueKey = (item: AttentionItem) => `atrasada:${item.pullRequest.id}`

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

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

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
  for (const event of soon.filter((e) => !seen.has(eventKey(e)))) {
    notices.push({
      title: `Às ${timeFormat.format(event.startsAt)}: ${event.title}`,
      body: event.calendar ? `Na agenda ${event.calendar}` : 'No seu calendário do DevDesk',
      url: `${webOrigin}/calendario`,
      tag: eventKey(event),
    })
  }
  for (const item of overdue.filter((entry) => !seen.has(overdueKey(entry)))) {
    const pr = item.pullRequest
    notices.push({
      title: `Review esperando há mais de 24 h: ${pr.repository}#${pr.number}`,
      body: pr.title,
      url: pr.url,
      tag: overdueKey(item),
    })
  }

  const fresh = attention.filter((item) => !seen.has(attentionKey(item)))
  if (fresh.length > MAX_SEPARATE) {
    notices.push({
      title: `${fresh.length} itens novos pedem sua atenção`,
      body: fresh
        .map(
          (item) =>
            `${REASON_TEXT[item.reason]}: ${item.pullRequest.repository}#${item.pullRequest.number}`,
        )
        .join(' · '),
      url: webOrigin,
      tag: 'atencao',
    })
  } else {
    for (const item of fresh) {
      const pr = item.pullRequest
      notices.push({
        title: `${REASON_TEXT[item.reason]}: ${pr.repository}#${pr.number}`,
        body: pr.title,
        url: pr.url,
        tag: attentionKey(item),
      })
    }
  }
  return { keys, notices }
}
