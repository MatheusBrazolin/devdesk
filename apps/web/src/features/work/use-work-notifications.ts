import type { AttentionItem } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { notificationsEnabled, notify } from '@/lib/notifications'
import { attentionKey, attentionNotice, newAttention } from './attention-notices'
import { dashboardQuery } from './queries'
import { isOverdue } from './review-queue'

const STORAGE_KEY = 'devdesk:avisados'
/** Mais que isso de uma vez vira um aviso só, em vez de uma pilha. */
const MAX_SEPARATE = 3

function readSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : null
  } catch {
    return null
  }
}

function writeSeen(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // Sem armazenamento: no pior caso, um aviso repete depois de recarregar.
  }
}

/**
 * Avisa quando aparece algo novo em "precisa da sua atenção": review pedida,
 * CI quebrado, mudanças pedidas, conflito ou pronto para merge. O painel já
 * se atualiza a cada dois minutos; aqui só se compara com o que já foi visto.
 * Na primeira leitura, e com os avisos desligados, só anota, sem avisar.
 */
export function useWorkNotifications(): void {
  const dashboard = useQuery(dashboardQuery)
  const attention = dashboard.data?.attention

  useEffect(() => {
    if (!attention) return
    const seen = readSeen()
    // Reviews que passaram de 24 h esperando: avisam uma vez, com chave própria.
    const overdue = attention.filter(
      (item) => item.reason === 'review_requested' && isOverdue(item.pullRequest),
    )
    const overdueKey = (item: AttentionItem) => `atrasada:${item.pullRequest.id}`
    writeSeen([...attention.map(attentionKey), ...overdue.map(overdueKey)])
    if (!seen || !notificationsEnabled()) return

    for (const item of overdue.filter((entry) => !seen.has(overdueKey(entry)))) {
      const pr = item.pullRequest
      notify({
        title: `Review esperando há mais de 24 h: ${pr.repository}#${pr.number}`,
        body: pr.title,
        url: pr.url,
        tag: overdueKey(item),
      })
    }

    const fresh = newAttention(seen, attention)
    if (fresh.length > MAX_SEPARATE) {
      notify({
        title: `${fresh.length} itens novos pedem sua atenção`,
        body: fresh.map((item) => attentionNotice(item).title).join(' · '),
        tag: 'atencao',
      })
      return
    }
    fresh.forEach((item) => notify(attentionNotice(item)))
  }, [attention])
}
