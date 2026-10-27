import { addDaysToKey, dateKey, fromKey } from '@/lib/calendar-dates'

export interface WeekWindow {
  /** Segunda-feira, "AAAA-MM-DD". */
  first: string
  /** Domingo. */
  last: string
  /** Meia-noite de segunda e da segunda seguinte, no fuso de quem pede. */
  from: Date
  to: Date
}

/** A semana (de segunda a domingo) que contém o dia. */
export function weekOf(day: string): WeekWindow {
  const date = fromKey(day)
  const sinceMonday = (date.getDay() + 6) % 7
  const first = addDaysToKey(day, -sinceMonday)
  const last = addDaysToKey(first, 6)
  const midnight = (key: string) => {
    const [year, month, dayOfMonth] = key.split('-').map(Number)
    return new Date(year!, month! - 1, dayOfMonth!)
  }
  return { first, last, from: midnight(first), to: midnight(addDaysToKey(first, 7)) }
}

export const currentWeek = (now = new Date()) => weekOf(dateKey(now))
