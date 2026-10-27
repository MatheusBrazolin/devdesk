/**
 * Lê o cabeçalho `github-authentication-token-expiration`, que vem como
 * "2026-11-26 17:00:00 UTC" ou "2026-11-26 17:00:00 -0300". Formato
 * desconhecido vira nulo: melhor não avisar do que avisar errado.
 */
export function parseTokenExpiration(header: string | null): Date | null {
  if (!header) return null
  const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) (UTC|[+-]\d{4})$/.exec(header.trim())
  if (!match) return null
  const [, day, time, zone] = match
  const offset = zone === 'UTC' ? 'Z' : `${zone!.slice(0, 3)}:${zone!.slice(3)}`
  const date = new Date(`${day}T${time}${offset}`)
  return Number.isNaN(date.getTime()) ? null : date
}
