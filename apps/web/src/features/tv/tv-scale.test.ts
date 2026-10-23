import { describe, expect, it } from 'vitest'
import { autoLayout, rowsToShow, tvFrame, WINDOW_PRESETS } from './tv-scale'

describe('arranjo automático pelo formato da janela', () => {
  it('tela larga comum é grade', () => {
    expect(autoLayout(1920, 1080)).toBe('grade')
    expect(autoLayout(1024, 768)).toBe('grade')
  })

  it('janela estreita e alta, ao lado do trabalho, é coluna', () => {
    expect(autoLayout(560, 1000)).toBe('coluna')
    expect(autoLayout(390, 844)).toBe('coluna')
  })

  it('tira larga e baixa é faixa', () => {
    expect(autoLayout(1920, 300)).toBe('faixa')
  })

  it('janelinha de canto é mini', () => {
    expect(autoLayout(520, 340)).toBe('mini')
  })

  it('janela média, onde a grade ficaria ilegível, é mini', () => {
    expect(autoLayout(800, 600)).toBe('mini')
  })
})

describe('quadro do modo TV', () => {
  it('Full HD amplia 1,5 vez e ocupa a tela inteira', () => {
    const frame = tvFrame(1920, 1080)
    expect(frame.layout).toBe('grade')
    expect(frame.scale).toBeCloseTo(1.5)
    expect(frame.width * frame.scale).toBeCloseTo(1920)
    expect(frame.height * frame.scale).toBeCloseTo(1080)
  })

  it('4K amplia 3 vezes: o texto cresce junto com a tela', () => {
    expect(tvFrame(3840, 2160).scale).toBeCloseTo(3)
  })

  it('tela ultralarga sobra largura útil, sem cortar a altura', () => {
    const frame = tvFrame(3440, 1440)
    expect(frame.scale).toBeCloseTo(2)
    expect(frame.height).toBeCloseTo(720)
    expect(frame.width).toBeCloseTo(1720)
  })

  it('a coluna nunca fica mais estreita nem mais baixa que a referência', () => {
    const frame = tvFrame(560, 1000)
    expect(frame.layout).toBe('coluna')
    expect(frame.width).toBeGreaterThanOrEqual(420 - 0.01)
    expect(frame.height).toBeGreaterThanOrEqual(880 - 0.01)
  })

  it('a escolha da pessoa vence o automático', () => {
    expect(tvFrame(1920, 1080, 'mini').layout).toBe('mini')
  })
})

describe('posições de janela', () => {
  const area = { left: 0, top: 25, width: 1920, height: 1055 }

  it('a coluna à direita encosta na borda e ocupa a altura toda', () => {
    const place = WINDOW_PRESETS.find((p) => p.id === 'coluna-direita')!.place(area)
    expect(place.left + place.width).toBe(1920)
    expect(place.height).toBe(1055)
    expect(place.top).toBe(25)
  })

  it('a faixa fica no pé da tela, de ponta a ponta', () => {
    const place = WINDOW_PRESETS.find((p) => p.id === 'faixa-embaixo')!.place(area)
    expect(place.top + place.height).toBe(1080)
    expect(place.width).toBe(1920)
  })
})

describe('linhas que cabem numa lista', () => {
  it('cabe tudo: mostra tudo, sem aviso', () => {
    expect(rowsToShow(4, 7, 6)).toBe(4)
  })

  it('passa do máximo: guarda uma vaga para o "e mais N"', () => {
    // 6 itens, máximo 5, cabem 5 linhas: 4 itens + "e mais 2".
    expect(rowsToShow(6, 5, 5)).toBe(4)
    // Cabem 6 linhas: 5 itens + "e mais 1".
    expect(rowsToShow(6, 5, 6)).toBe(5)
  })

  it('pouco espaço: nunca menos de uma linha', () => {
    expect(rowsToShow(10, 7, 1)).toBe(1)
  })

  it('antes de medir (Infinity), mostra até o máximo', () => {
    expect(rowsToShow(10, 7, Infinity)).toBe(7)
  })
})
