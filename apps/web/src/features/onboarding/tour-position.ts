/**
 * Onde pôr o cartão do tour ao lado do elemento destacado. Conta pura, sem
 * DOM, para dar para testar: tenta os lados na ordem pedida, fica com o
 * primeiro em que o cartão cabe inteiro e centraliza no elemento, sem sair da
 * tela. A seta aponta para o meio do elemento, até onde o cartão deixa.
 */

export type Side = 'top' | 'right' | 'bottom' | 'left'

export interface Box {
  top: number
  left: number
  width: number
  height: number
}

export interface Placement {
  top: number
  left: number
  side: Side
  /** Distância da seta até a borda (esquerda ou de cima) do cartão. */
  arrow: number
}

/** Folga entre o elemento e o cartão (a seta mora aí). */
export const GAP = 14
/** Distância mínima das bordas da tela. */
export const MARGIN = 12
const ARROW_INSET = 20

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

export function placeCard(
  anchor: Box,
  card: { width: number; height: number },
  viewport: { width: number; height: number },
  sides: Side[],
): Placement {
  const room: Record<Side, number> = {
    top: anchor.top - GAP - MARGIN,
    bottom: viewport.height - (anchor.top + anchor.height) - GAP - MARGIN,
    left: anchor.left - GAP - MARGIN,
    right: viewport.width - (anchor.left + anchor.width) - GAP - MARGIN,
  }
  const need = (side: Side) => (side === 'top' || side === 'bottom' ? card.height : card.width)
  // Nenhum lado cabe: fica onde sobra mais espaço.
  const side =
    sides.find((candidate) => room[candidate] >= need(candidate)) ??
    sides.reduce((best, candidate) =>
      room[candidate] - need(candidate) > room[best] - need(best) ? candidate : best,
    )

  if (side === 'top' || side === 'bottom') {
    const center = anchor.left + anchor.width / 2
    const left = clamp(center - card.width / 2, MARGIN, viewport.width - card.width - MARGIN)
    const top =
      side === 'bottom' ? anchor.top + anchor.height + GAP : anchor.top - GAP - card.height
    return {
      side,
      left,
      top: clamp(top, MARGIN, viewport.height - card.height - MARGIN),
      arrow: clamp(center - left, ARROW_INSET, card.width - ARROW_INSET),
    }
  }

  // Elemento alto (uma coluna inteira): o cartão mira o topo dele, não o meio.
  const center = anchor.top + Math.min(anchor.height / 2, 120)
  const top = clamp(center - card.height / 2, MARGIN, viewport.height - card.height - MARGIN)
  const left = side === 'right' ? anchor.left + anchor.width + GAP : anchor.left - GAP - card.width
  return {
    side,
    top,
    left: clamp(left, MARGIN, viewport.width - card.width - MARGIN),
    arrow: clamp(center - top, ARROW_INSET, card.height - ARROW_INSET),
  }
}
