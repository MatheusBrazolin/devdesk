import type { StandupItem } from '@devdesk/shared'
import type { StandupFormat } from '@/features/standup/format'
import { translateDetail, waitingDays } from '@/features/standup/detail'
import { plural, t } from '@/lib/i18n'

export interface WeekText {
  /** "20 a 26 de out." */
  label: string
  done: StandupItem[]
  blockers: StandupItem[]
}

const SECTIONS: { title: string; kinds: StandupItem['kind'][] }[] = [
  { title: t('Entregue'), kinds: ['merged', 'closed_issue'] },
  { title: t('Revisado'), kinds: ['reviewed'] },
  { title: t('Aberto'), kinds: ['opened'] },
]

const link = (item: StandupItem, format: StandupFormat) => {
  const label = `${item.repository}#${item.number}`
  if (format === 'markdown') return `[${label}](${item.url})`
  if (format === 'slack') return `<${item.url}|${label}>`
  return label
}

const bold = (text: string, format: StandupFormat) =>
  format === 'markdown' ? `**${text}**` : format === 'slack' ? `*${text}*` : text

/** Os números da semana, na ordem em que aparecem na página e no texto. */
export function weekCounts(done: StandupItem[]) {
  const of = (kind: StandupItem['kind']) => done.filter((item) => item.kind === kind).length
  return {
    merged: of('merged'),
    opened: of('opened'),
    reviewed: of('reviewed'),
    closedIssues: of('closed_issue'),
  }
}

/** O resumo da semana, pronto para colar num 1:1 ou numa retrospectiva. */
export function formatWeek(input: WeekText, format: StandupFormat): string {
  const counts = weekCounts(input.done)
  const lines = [
    bold(t('Semana de {semana}', { semana: input.label }), format),
    [
      plural(counts.merged, '{n} PR mergeado', '{n} PRs mergeados'),
      plural(counts.reviewed, '{n} review feita', '{n} reviews feitas'),
      plural(counts.opened, '{n} PR aberto', '{n} PRs abertos'),
      plural(counts.closedIssues, '{n} issue fechada', '{n} issues fechadas'),
    ].join(' · '),
  ]
  for (const section of SECTIONS) {
    const items = input.done.filter((item) => section.kinds.includes(item.kind))
    if (items.length === 0) continue
    lines.push('', bold(section.title, format))
    for (const item of items) {
      const detail = item.detail ? ` (${translateDetail(item.detail)})` : ''
      lines.push(`- ${link(item, format)}: ${item.title}${detail}`)
    }
  }
  lines.push('', bold(t('Travado agora'), format))
  if (input.blockers.length === 0) lines.push(`- ${t('Nada travado.')}`)
  for (const item of input.blockers) {
    const days = waitingDays(item.detail)
    lines.push(
      days === null
        ? `- ${t('{item}: {titulo} (esperando review {detalhe})', {
            item: link(item, format),
            titulo: item.title,
            detalhe: item.detail ?? '',
          })}`.replace(' )', ')')
        : `- ${t('{item}: {titulo} (esperando review há {n} dias)', {
            item: link(item, format),
            titulo: item.title,
            n: days,
          })}`,
    )
  }
  return lines.join('\n')
}
