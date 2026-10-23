import type { CalendarEvent, StandupItem } from '@devdesk/shared'

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
  merged: 'Mergeei',
  opened: 'Abri',
  reviewed: 'Revisei',
  closed_issue: 'Fechei a issue',
}

const TODAY: Partial<Record<StandupItem['kind'], string>> = {
  review_requested: 'Revisar',
  changes_requested: 'Ajustar o que pediram em',
  ci_failed: 'Corrigir o CI de',
  conflict: 'Resolver o conflito de',
  ready_to_merge: 'Fazer merge de',
}

const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

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

/** O texto do standup, pronto para colar. Seções vazias dizem que estão vazias. */
export function formatStandup(input: StandupText, format: StandupFormat): string {
  const done = input.done.map((item) => line(DONE[item.kind] ?? '', item, format, item.detail))

  const events = input.events.map((event) =>
    event.allDay
      ? `- ${event.title} (dia todo)`
      : `- ${timeFormat.format(new Date(event.startsAt))} ${event.title}`,
  )
  const today = [
    ...events,
    ...input.today.map((item) =>
      line(
        TODAY[item.kind] ?? '',
        item,
        format,
        item.kind === 'ready_to_merge' ? 'aprovado' : item.detail,
      ),
    ),
  ]

  const blockers = input.blockers.map((item) =>
    `- ${link(item, format)} esperando review ${item.detail ?? ''}`.trimEnd(),
  )

  return [
    bold(`Ontem (${input.sinceLabel})`, format),
    ...(done.length ? done : ['- Nada registrado no GitHub.']),
    '',
    bold('Hoje', format),
    ...(today.length ? today : ['- Sem pendências no GitHub nem eventos na agenda.']),
    '',
    bold('Bloqueios', format),
    ...(blockers.length ? blockers : ['- Nenhum.']),
  ].join('\n')
}
