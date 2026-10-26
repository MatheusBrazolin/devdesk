/** Horas para leitura rápida: "45 min", "6 h", "1 d 15 h". */
export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 24) return `${Math.round(hours)} h`
  const days = Math.floor(hours / 24)
  const rest = Math.round(hours % 24)
  return rest ? `${days} d ${rest} h` : `${days} d`
}

/** "7/9": dia e mês da segunda-feira da semana. */
export const weekLabel = (weekStart: string) => {
  const [, month, day] = weekStart.split('-').map(Number)
  return `${day}/${month}`
}
