import type { GitHubHealth } from '@devdesk/shared'
import { t } from '@/lib/i18n'

/** Dias antes do vencimento em que o aviso aparece. */
export const EXPIRY_WARNING_DAYS = 7

export type TokenAlert =
  | { kind: 'none' }
  | { kind: 'expiring'; days: number; source: GitHubHealth['source'] }
  | { kind: 'refused'; source: GitHubHealth['source'] }

const DAY = 24 * 60 * 60 * 1000

/** O que avisar sobre o token: nada, que vence logo ou que o GitHub recusou. */
export function tokenAlert(health: GitHubHealth | null | undefined, now: Date): TokenAlert {
  if (!health) return { kind: 'none' }
  if (!health.ok) return { kind: 'refused', source: health.source }
  if (!health.expiresAt) return { kind: 'none' }
  const days = Math.ceil((new Date(health.expiresAt).getTime() - now.getTime()) / DAY)
  if (days > EXPIRY_WARNING_DAYS) return { kind: 'none' }
  return { kind: 'expiring', days: Math.max(days, 0), source: health.source }
}

export const SOURCE_LABELS: Record<GitHubHealth['source'], string> = {
  personal: t('seu token pessoal'),
  server: t('o token pessoal configurado no servidor'),
  oauth: t('o login pelo GitHub'),
}
