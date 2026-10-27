import type { AttentionReason } from '@devdesk/shared'
import { t } from '@/lib/i18n'

type Tone = 'accent' | 'success' | 'danger'

export const REASON_LABEL: Record<AttentionReason, { text: string; tone: Tone }> = {
  review_requested: { text: t('review pedida'), tone: 'accent' },
  changes_requested: { text: t('mudanças pedidas'), tone: 'danger' },
  ci_failed: { text: t('CI falhou'), tone: 'danger' },
  conflict: { text: t('conflito'), tone: 'danger' },
  ready_to_merge: { text: t('pronto para merge'), tone: 'success' },
}
