import type { AttentionItem } from '@devdesk/shared'
import { REASON_LABEL } from './labels'

/** Um item de atenção é "o mesmo" enquanto o PR e o motivo não mudam. */
export const attentionKey = (item: AttentionItem) => `${item.reason}:${item.pullRequest.id}`

/** Os itens que não estavam na última leitura: só esses viram aviso. */
export function newAttention(seen: ReadonlySet<string>, items: AttentionItem[]): AttentionItem[] {
  return items.filter((item) => !seen.has(attentionKey(item)))
}

/** Título e texto do aviso de um item. */
export function attentionNotice(item: AttentionItem) {
  const pr = item.pullRequest
  return {
    title: `${capitalize(REASON_LABEL[item.reason].text)}: ${pr.repository}#${pr.number}`,
    body: pr.title,
    url: pr.url,
    tag: attentionKey(item),
  }
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
