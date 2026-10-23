import { useSyncExternalStore } from 'react'

/**
 * O modo TV tem um arranjo para cada formato de janela, cada um desenhado
 * num quadro de referência e ampliado para a tela: numa TV 4K o texto cresce
 * junto, e numa coluna estreita ao lado do trabalho nada precisa rolar. O
 * quadro nunca fica menor que a referência; a sobra vira espaço útil.
 */
export type TvLayout = 'grade' | 'coluna' | 'faixa' | 'mini'
export type TvLayoutChoice = TvLayout | 'auto'

export const TV_LAYOUTS: { value: TvLayoutChoice; label: string; hint: string }[] = [
  { value: 'auto', label: 'Automático', hint: 'segue o formato da janela' },
  { value: 'grade', label: 'Grade', hint: 'tela cheia ou TV' },
  { value: 'coluna', label: 'Coluna', hint: 'janela estreita ao lado' },
  { value: 'faixa', label: 'Faixa', hint: 'tira larga em cima ou embaixo' },
  { value: 'mini', label: 'Mini', hint: 'janelinha no canto' },
]

/** Quadro de referência de cada arranjo, em px de CSS. */
export const LAYOUT_BASE: Record<TvLayout, { width: number; height: number }> = {
  // 1280×720: numa TV Full HD tudo sai 1,5× maior, legível do outro lado da sala.
  grade: { width: 1280, height: 720 },
  coluna: { width: 420, height: 880 },
  faixa: { width: 1280, height: 260 },
  mini: { width: 460, height: 300 },
}

export const isTvLayoutChoice = (value: unknown): value is TvLayoutChoice =>
  TV_LAYOUTS.some((layout) => layout.value === value)

/** O arranjo que melhor usa uma janela deste formato. */
export function autoLayout(width: number, height: number): TvLayout {
  const ratio = width / height
  if (ratio <= 0.85) return 'coluna'
  if (ratio >= 3) return 'faixa'
  // A grade só vale se couber sem encolher demais: abaixo de 0,75× o texto
  // fica ilegível, e o mini (só os números, grandes) diz mais.
  const grade = LAYOUT_BASE.grade
  if (Math.min(width / grade.width, height / grade.height) < MIN_GRADE_SCALE) return 'mini'
  return 'grade'
}

const MIN_GRADE_SCALE = 0.75

export interface TvFrame {
  layout: TvLayout
  /** Fator de ampliação aplicado com `zoom`. */
  scale: number
  /** Tamanho do quadro antes de ampliar, em px de CSS. */
  width: number
  height: number
}

export function tvFrame(
  screenWidth: number,
  screenHeight: number,
  choice: TvLayoutChoice = 'auto',
): TvFrame {
  const layout = choice === 'auto' ? autoLayout(screenWidth, screenHeight) : choice
  const base = LAYOUT_BASE[layout]
  const scale = Math.min(screenWidth / base.width, screenHeight / base.height)
  return { layout, scale, width: screenWidth / scale, height: screenHeight / scale }
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}
// Uma string estável: useSyncExternalStore compara por igualdade.
const snapshot = () => `${window.innerWidth}x${window.innerHeight}`

export function useTvFrame(choice: TvLayoutChoice): TvFrame {
  const size = useSyncExternalStore(subscribe, snapshot, () => '1280x720')
  const [width, height] = size.split('x').map(Number)
  return tvFrame(width!, height!, choice)
}

/**
 * Posições prontas para abrir o modo TV numa janela à parte, já no tamanho
 * e no lugar certos da tela (o navegador só deixa fazer isso por um clique).
 */
export interface WindowPreset {
  id: string
  label: string
  layout: TvLayout
  place: (area: ScreenArea) => { left: number; top: number; width: number; height: number }
}

export interface ScreenArea {
  left: number
  top: number
  width: number
  height: number
}

const COLUMN_WIDTH = 440
const STRIP_HEIGHT = 300
const CORNER = { width: 520, height: 340 }

export const WINDOW_PRESETS: WindowPreset[] = [
  {
    id: 'coluna-direita',
    label: 'Coluna à direita',
    layout: 'coluna',
    place: (a) => ({
      left: a.left + a.width - COLUMN_WIDTH,
      top: a.top,
      width: COLUMN_WIDTH,
      height: a.height,
    }),
  },
  {
    id: 'coluna-esquerda',
    label: 'Coluna à esquerda',
    layout: 'coluna',
    place: (a) => ({ left: a.left, top: a.top, width: COLUMN_WIDTH, height: a.height }),
  },
  {
    id: 'faixa-embaixo',
    label: 'Faixa embaixo',
    layout: 'faixa',
    place: (a) => ({
      left: a.left,
      top: a.top + a.height - STRIP_HEIGHT,
      width: a.width,
      height: STRIP_HEIGHT,
    }),
  },
  {
    id: 'canto',
    label: 'Canto inferior direito',
    layout: 'mini',
    place: (a) => ({
      left: a.left + a.width - CORNER.width,
      top: a.top + a.height - CORNER.height,
      ...CORNER,
    }),
  },
  {
    id: 'tela-toda',
    label: 'Tela toda',
    layout: 'grade',
    place: (a) => ({ ...a }),
  },
]

/**
 * Quantas linhas de uma lista mostrar, sem cortar nenhuma ao meio: até `max`,
 * e se sobrar item de fora, uma vaga fica para o "e mais N".
 */
export function rowsToShow(total: number, max: number, fit: number): number {
  const wanted = Math.min(total, max)
  const needed = wanted + (total > wanted ? 1 : 0)
  if (fit >= needed) return wanted
  return Math.max(1, Math.min(wanted, fit - 1))
}
