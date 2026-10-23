import { addDaysToKey, dateKey, fromKey } from '@/lib/calendar-dates'

export interface StandupWindow {
  /** Primeiro dia coberto. */
  first: string
  /** Último dia coberto. */
  last: string
  /** Início e fim (exclusivo) no fuso local, como instantes. */
  from: Date
  to: Date
}

const midnight = (key: string) => {
  const date = fromKey(key)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Um dia só, da meia-noite local à meia-noite seguinte. */
export function windowForDay(day: string): StandupWindow {
  return { first: day, last: day, from: midnight(day), to: midnight(addDaysToKey(day, 1)) }
}

/**
 * O "ontem" do standup: o dia útil anterior. Na segunda (e no fim de semana)
 * vale desde sexta, para o trabalho do fim de semana também entrar.
 */
export function previousWorkday(now = new Date()): StandupWindow {
  const today = dateKey(now)
  const weekday = fromKey(today).getDay() // 0 = domingo, 1 = segunda, 6 = sábado
  // Segunda volta até sexta; domingo também; sábado e os outros dias voltam um.
  const back = weekday === 1 ? 3 : weekday === 0 ? 2 : 1
  const first = addDaysToKey(today, -back)
  if (back > 1)
    return { first, last: addDaysToKey(today, -1), from: midnight(first), to: midnight(today) }
  return windowForDay(first)
}
