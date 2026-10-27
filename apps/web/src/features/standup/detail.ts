import { t } from '@/lib/i18n'

/**
 * O complemento que a API manda em português ("aprovado", "de ana", "há 3
 * dias"), no idioma do app. Texto desconhecido passa pelo dicionário e, sem
 * tradução, fica como veio.
 */
export function translateDetail(detail: string | null): string | null {
  if (!detail) return detail
  const days = /^há (\d+) dias$/.exec(detail)
  if (days) return t('há {n} dias', { n: days[1]! })
  const author = /^de (.+)$/.exec(detail)
  if (author) return t('de {pessoa}', { pessoa: author[1]! })
  return t(detail)
}

/** Dias de espera de um item travado ("há 9 dias" → 9), ou nulo. */
export function waitingDays(detail: string | null): number | null {
  const days = detail && /^há (\d+) dias$/.exec(detail)
  return days ? Number(days[1]) : null
}
