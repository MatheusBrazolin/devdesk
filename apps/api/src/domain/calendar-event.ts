import { AppError } from './errors.js'
import type { NoteLink } from './note.js'

/** Dia inteiro: datas sem fuso. Com horário: instantes. Ver o contrato em @devdesk/shared. */
export type EventTiming =
  | { allDay: true; date: string; endDate: string | null }
  | { allDay: false; startsAt: Date; endsAt: Date | null }

export type EventKind = 'event' | 'reminder'

export type CalendarEvent = {
  id: string
  userId: string
  title: string
  description: string
  kind: EventKind
  link: NoteLink | null
  createdAt: Date
  updatedAt: Date
} & EventTiming

const MAX_DAYS = 62
const DAY_MS = 86_400_000

const invalid = (message: string) => new AppError('VALIDATION', message)

/** Regras de um horário de evento que o formato sozinho não garante. */
export function assertValidTiming(timing: EventTiming): void {
  if (timing.allDay) {
    if (!timing.endDate) return
    if (timing.endDate < timing.date) throw invalid('O último dia vem antes do primeiro.')
    // Os dois dias contam: de 1º a 3 são 3 dias, não 2.
    const days = (Date.parse(timing.endDate) - Date.parse(timing.date)) / DAY_MS + 1
    if (days > MAX_DAYS) throw invalid(`Um evento pode durar até ${MAX_DAYS} dias.`)
    return
  }
  if (!timing.endsAt) return
  if (timing.endsAt.getTime() <= timing.startsAt.getTime()) {
    throw invalid('O fim precisa ser depois do começo.')
  }
  if (timing.endsAt.getTime() - timing.startsAt.getTime() > MAX_DAYS * DAY_MS) {
    throw invalid(`Um evento pode durar até ${MAX_DAYS} dias.`)
  }
}

/** Soma dias a uma data de calendário ("2026-10-31" + 1 = "2026-11-01"). */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10)
}
