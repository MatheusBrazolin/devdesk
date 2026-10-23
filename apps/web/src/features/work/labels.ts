import type { AttentionReason } from '@devdesk/shared'

type Tone = 'accent' | 'success' | 'danger'

export const REASON_LABEL: Record<AttentionReason, { text: string; tone: Tone }> = {
  review_requested: { text: 'review pedida', tone: 'accent' },
  changes_requested: { text: 'mudanças pedidas', tone: 'danger' },
  ci_failed: { text: 'CI falhou', tone: 'danger' },
  conflict: { text: 'conflito', tone: 'danger' },
  ready_to_merge: { text: 'pronto para merge', tone: 'success' },
}
