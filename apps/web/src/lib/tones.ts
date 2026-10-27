/**
 * Cores de assunto. Cada seção e cada indicador tem uma, e ela aparece no
 * ícone da barra lateral, no cabeçalho da página e nos cartões do painel.
 */
export type Tone = 'accent' | 'success' | 'info' | 'merged'

/** Ícone na cor do assunto, sem quadrado de fundo (o Quadro não usa ícone em quadrado). */
export const TONE_CHIP: Record<Tone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  info: 'text-info',
  merged: 'text-merged',
}

export const TONE_TEXT: Record<Tone, string> = {
  accent: 'text-accent',
  success: 'text-success',
  info: 'text-info',
  merged: 'text-merged',
}

export const TONE_BG: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  info: 'bg-info',
  merged: 'bg-merged',
}

/** Para ícones dentro de um item com `group`: a cor acende ao passar o mouse. */
export const TONE_GROUP_HOVER: Record<Tone, string> = {
  accent: 'group-hover:text-accent',
  success: 'group-hover:text-success',
  info: 'group-hover:text-info',
  merged: 'group-hover:text-merged',
}
