import type { AttentionItem } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { t } from '@/lib/i18n'
import { notificationsEnabled, notify } from '@/lib/notifications'
import { attentionKey, attentionNotice, newAttention } from './attention-notices'
import { dashboardQuery } from './queries'
import { noticeEnabled, settingsQuery } from '@/features/settings/queries'
import { isOverdue } from './review-queue'

const STORAGE_KEY = 'devdesk:avisados'
/** Mais que isso de uma vez vira um aviso só, em vez de uma pilha. */
const MAX_SEPARATE = 3

/** Quanto tempo um item já avisado fica lembrado depois de sumir da lista. */
const FORGET_AFTER_MS = 7 * 24 * 60 * 60 * 1000

/** Chave → quando foi vista pela última vez. A versão antiga guardava só a lista de chaves. */
type Seen = Record<string, number>

export function readSeen(raw: string | null, now: number): Seen | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return Object.fromEntries(parsed.map((key) => [String(key), now]))
    return parsed && typeof parsed === 'object' ? (parsed as Seen) : null
  } catch {
    return null
  }
}

/**
 * Soma o que está na tela agora ao que já foi visto, em vez de trocar: um
 * item que some numa rodada (o GitHub recalculando o conflito, a lista
 * cortada em 30) não volta como novo. Esquece só depois de uma semana.
 */
export function mergeSeen(seen: Seen | null, keys: string[], now: number): Seen {
  const merged: Seen = {}
  for (const [key, at] of Object.entries(seen ?? {})) {
    if (now - at < FORGET_AFTER_MS) merged[key] = at
  }
  for (const key of keys) merged[key] = now
  return merged
}

function loadSeen(now: number): Seen | null {
  try {
    return readSeen(localStorage.getItem(STORAGE_KEY), now)
  } catch {
    return null
  }
}

function saveSeen(seen: Seen) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
  } catch {
    // Sem armazenamento: no pior caso, um aviso repete depois de recarregar.
  }
}

/**
 * Avisa quando aparece algo novo em "precisa da sua atenção": review pedida,
 * CI quebrado, mudanças pedidas, conflito ou pronto para merge. O painel já
 * se atualiza a cada 30 segundos; aqui só se compara com o que já foi visto.
 * Na primeira leitura, e com os avisos desligados, só anota, sem avisar.
 */
export function useWorkNotifications(): void {
  const dashboard = useQuery(dashboardQuery)
  const attention = dashboard.data?.attention
  const settingsState = useQuery(settingsQuery)
  const settings = settingsState.data
  // Se as configurações falharem, avisa com o padrão em vez de nunca avisar.
  const settingsReady = settingsState.isSuccess || settingsState.isError

  useEffect(() => {
    // Sem as configurações ainda, não dá para saber o que está desligado: espera.
    if (!attention || !settingsReady) return
    const now = Date.now()
    const stored = loadSeen(now)
    const seen = stored && new Set(Object.keys(stored))
    // Reviews que passaram de 24 h esperando: avisam uma vez, com chave própria.
    const overdue = attention.filter(
      (item) => item.reason === 'review_requested' && isOverdue(item.pullRequest),
    )
    const overdueKey = (item: AttentionItem) => `atrasada:${item.pullRequest.id}`
    saveSeen(mergeSeen(stored, [...attention.map(attentionKey), ...overdue.map(overdueKey)], now))
    if (!seen || !notificationsEnabled()) return

    // Tipo desligado nas configurações: fica anotado como visto, mas não avisa.
    for (const item of overdue.filter(
      (entry) => noticeEnabled(settings, 'overdue_review') && !seen.has(overdueKey(entry)),
    )) {
      const pr = item.pullRequest
      notify({
        title: t('Review esperando há mais de 24 h: {pr}', { pr: `${pr.repository}#${pr.number}` }),
        body: pr.title,
        url: pr.url,
        tag: overdueKey(item),
      })
    }

    const fresh = newAttention(seen, attention).filter((item) =>
      noticeEnabled(settings, item.reason),
    )
    if (fresh.length > MAX_SEPARATE) {
      notify({
        title: t('{n} itens novos pedem sua atenção', { n: fresh.length }),
        body: fresh.map((item) => attentionNotice(item).title).join(' · '),
        tag: 'atencao',
      })
      return
    }
    fresh.forEach((item) => notify(attentionNotice(item)))
  }, [attention, settings, settingsReady])
}
