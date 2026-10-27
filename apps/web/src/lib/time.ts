import { LOCALE, t } from './i18n'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const shortDate = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" e, depois de um mês, a data. */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime()
  if (diff < MINUTE) return t('agora')
  if (diff < HOUR) return t('há {n} min', { n: Math.floor(diff / MINUTE) })
  if (diff < DAY) return t('há {n} h', { n: Math.floor(diff / HOUR) })
  const days = Math.floor(diff / DAY)
  if (days === 1) return t('ontem')
  if (days < 30) return t('há {n} dias', { n: days })
  return shortDate.format(date)
}
