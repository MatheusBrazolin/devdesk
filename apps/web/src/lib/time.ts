const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias" e, depois de um mês, a data. */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime()
  if (diff < MINUTE) return 'agora'
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`
  const days = Math.floor(diff / DAY)
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  return shortDate.format(date)
}
