import type { CalendarEvent, StandupItem } from '@devdesk/shared'
import { LOCALE, t } from '@/lib/i18n'
import { translateDetail, waitingDays } from './detail'

export type StandupFormat = 'markdown' | 'slack' | 'texto'

export interface StandupText {
  sinceLabel: string
  done: StandupItem[]
  today: StandupItem[]
  blockers: StandupItem[]
  /** Eventos de hoje, já filtrados pelo dia local. */
  events: CalendarEvent[]
}

const DONE: Partial<Record<StandupItem['kind'], string>> = {
  merged: t('Mergeei'),
  opened: t('Abri'),
  reviewed: t('Revisei'),
  closed_issue: t('Fechei a issue'),
}

const TODAY: Partial<Record<StandupItem['kind'], string>> = {
  review_requested: t('Revisar'),
  changes_requested: t('Ajustar o que pediram em'),
  ci_failed: t('Corrigir o CI de'),
  conflict: t('Resolver o conflito de'),
  ready_to_merge: t('Fazer merge de'),
}

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

function link(item: StandupItem, format: StandupFormat): string {
  const label = `${item.repository}#${item.number}`
  if (format === 'markdown') return `[${label}](${item.url})`
  if (format === 'slack') return `<${item.url}|${label}>`
  return label
}

const bold = (text: string, format: StandupFormat) =>
  format === 'markdown' ? `**${text}**` : format === 'slack' ? `*${text}*` : text

function line(
  verb: string,
  item: StandupItem,
  format: StandupFormat,
  suffix?: string | null,
): string {
  return `- ${verb} ${link(item, format)}: ${item.title}${suffix ? ` (${suffix})` : ''}`
}

/** "- repo#1 esperando review há 9 dias", com os dias no idioma do app. */
function blockerLine(item: string, detail: string | null): string {
  const days = waitingDays(detail)
  return days === null
    ? `- ${t('{item} esperando review {detalhe}', { item, detalhe: detail ?? '' })}`.trimEnd()
    : `- ${t('{item} esperando review há {n} dias', { item, n: days })}`
}

/** O texto do standup, pronto para colar. Seções vazias dizem que estão vazias. */
export function formatStandup(input: StandupText, format: StandupFormat): string {
  const done = input.done.map((item) =>
    line(DONE[item.kind] ?? '', item, format, translateDetail(item.detail)),
  )

  const events = input.events.map((event) =>
    event.allDay
      ? `- ${event.title} (${t('dia todo')})`
      : `- ${timeFormat.format(new Date(event.startsAt))} ${event.title}`,
  )
  const today = [
    ...events,
    ...input.today.map((item) =>
      line(
        TODAY[item.kind] ?? '',
        item,
        format,
        item.kind === 'ready_to_merge' ? t('aprovado') : translateDetail(item.detail),
      ),
    ),
  ]

  const blockers = input.blockers.map((item) => blockerLine(link(item, format), item.detail))

  return [
    bold(t('Ontem ({data})', { data: input.sinceLabel }), format),
    ...(done.length ? done : [`- ${t('Nada registrado no GitHub.')}`]),
    '',
    bold(t('Hoje'), format),
    ...(today.length ? today : [`- ${t('Sem pendências no GitHub nem eventos na agenda.')}`]),
    '',
    bold(t('Bloqueios'), format),
    ...(blockers.length ? blockers : [`- ${t('Nenhum.')}`]),
  ].join('\n')
}
