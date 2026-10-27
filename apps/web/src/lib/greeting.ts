import { LOCALE, t } from './i18n'

/** Saudação pela hora local: madrugada conta como "boa noite". */
export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return t('Bom dia')
  if (hour >= 12 && hour < 18) return t('Boa tarde')
  return t('Boa noite')
}

const longDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export const formatLongDate = (date: Date) => longDate.format(date)

export function firstName(name: string | null, fallback: string): string {
  return name?.trim().split(/\s+/)[0] || fallback
}

export function initials(name: string | null, login: string): string {
  const source = name?.trim() || login
  const parts = source.split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0]![0], parts.at(-1)![0]] : [source[0], source[1]]
  return letters.filter(Boolean).join('').toUpperCase()
}
