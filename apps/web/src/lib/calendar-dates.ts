import type { CalendarEvent } from '@devdesk/shared'
import { LOCALE } from '@/lib/i18n'

/**
 * Datas de calendário como "AAAA-MM-DD", sempre no fuso de quem está olhando.
 * Comparar essas strings em ordem alfabética é comparar datas.
 */

const pad = (n: number) => String(n).padStart(2, '0')

/** A data local de um instante. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Meio-dia local da data: longe da meia-noite, a salvo do horário de verão. */
export function fromKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year!, month! - 1, day!, 12)
}

export function addDaysToKey(key: string, days: number): string {
  const date = fromKey(key)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

/** "2026-10" → 1º de outubro. Valor inválido cai no mês atual. */
export function parseMonth(
  value: string | undefined,
  today = new Date(),
): { year: number; month: number } {
  const match = value?.match(/^(\d{4})-(\d{2})$/)
  if (match) {
    const month = Number(match[2]) - 1
    if (month >= 0 && month <= 11) return { year: Number(match[1]), month }
  }
  return { year: today.getFullYear(), month: today.getMonth() }
}

export const monthKey = (year: number, month: number) => {
  const date = new Date(year, month, 1, 12)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

/**
 * As semanas que aparecem na grade de um mês, de domingo a sábado, sempre
 * seis linhas, para a altura da grade não pular de um mês para outro.
 */
export function monthGrid(year: number, month: number): string[][] {
  const first = new Date(year, month, 1, 12)
  const start = new Date(first)
  start.setDate(1 - first.getDay())
  const weeks: string[][] = []
  for (let w = 0; w < 6; w++) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      week.push(dateKey(day))
    }
    weeks.push(week)
  }
  return weeks
}

/** Primeiro e último dia da grade: o intervalo a pedir para a API. */
export function gridRange(year: number, month: number): { from: string; to: string } {
  const weeks = monthGrid(year, month)
  return { from: weeks[0]![0]!, to: weeks[5]![6]! }
}

/** Primeiro e último dia local que um evento ocupa. */
export function eventSpan(event: CalendarEvent): { first: string; last: string } {
  if (event.allDay) return { first: event.date, last: event.endDate ?? event.date }
  const first = dateKey(new Date(event.startsAt))
  const last = event.endsAt ? dateKey(new Date(new Date(event.endsAt).getTime() - 1)) : first
  return { first, last: last < first ? first : last }
}

export function occursOn(event: CalendarEvent, day: string): boolean {
  const { first, last } = eventSpan(event)
  return first <= day && day <= last
}

const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
export const formatTime = (iso: string) => timeFormat.format(new Date(iso))

/** Dia inteiro antes, depois pelo horário, depois pelo título. */
export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
  const at = a.allDay ? a.date : a.startsAt
  const bt = b.allDay ? b.date : b.startsAt
  return at.localeCompare(bt) || a.title.localeCompare(b.title)
}
