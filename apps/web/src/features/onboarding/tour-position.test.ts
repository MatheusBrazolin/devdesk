import { describe, expect, it } from 'vitest'
import { GAP, MARGIN, placeCard } from './tour-position'

const viewport = { width: 1440, height: 900 }
const card = { width: 340, height: 200 }

describe('placeCard', () => {
  it('põe o cartão embaixo do elemento, centralizado, com a seta no meio dele', () => {
    const anchor = { top: 24, left: 500, width: 400, height: 44 }
    const place = placeCard(anchor, card, viewport, ['bottom', 'top'])
    expect(place.side).toBe('bottom')
    expect(place.top).toBe(24 + 44 + GAP)
    expect(place.left).toBe(700 - 170)
    expect(place.arrow).toBe(170)
  })

  it('pula o lado sem espaço e usa o seguinte', () => {
    const anchor = { top: 100, left: 1100, width: 320, height: 600 }
    expect(placeCard(anchor, card, viewport, ['right', 'left']).side).toBe('left')
  })

  it('não deixa o cartão sair da tela; a seta continua apontando para o elemento', () => {
    const anchor = { top: 24, left: 1380, width: 40, height: 40 }
    const place = placeCard(anchor, card, viewport, ['bottom'])
    expect(place.left).toBe(viewport.width - card.width - MARGIN)
    expect(place.left + place.arrow).toBe(1400)
  })

  it('numa coluna alta, mira o topo dela', () => {
    const anchor = { top: 200, left: 40, width: 320, height: 680 }
    const place = placeCard(anchor, card, viewport, ['right'])
    expect(place.side).toBe('right')
    expect(place.left).toBe(40 + 320 + GAP)
    expect(place.top + place.arrow).toBe(320)
  })

  it('sem lado que caiba, fica onde sobra mais espaço', () => {
    const anchor = { top: 0, left: 0, width: 1440, height: 860 }
    expect(placeCard(anchor, card, viewport, ['right', 'bottom', 'top']).side).toBe('bottom')
  })
})
