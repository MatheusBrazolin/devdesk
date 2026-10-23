import {
  CalendarDays,
  CircleDot,
  GitPullRequest,
  type LucideIcon,
  MessageSquareText,
  NotebookPen,
  Sun,
} from 'lucide-react'
import type { Tone } from './tones'

export interface NavItem {
  to: '/' | '/pull-requests' | '/issues' | '/notas' | '/calendario' | '/standup'
  label: string
  icon: LucideIcon
  /** Atalho "g + tecla", no estilo do GitHub e do Linear. */
  shortcut: string
  /** Cor da seção: ícone na barra lateral e no cabeçalho da página. */
  tone: Tone
}

/** Fonte única da navegação: a sidebar e a paleta de comandos leem daqui. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hoje', icon: Sun, shortcut: 'h', tone: 'accent' },
  {
    to: '/pull-requests',
    label: 'Pull requests',
    icon: GitPullRequest,
    shortcut: 'p',
    tone: 'success',
  },
  { to: '/issues', label: 'Issues', icon: CircleDot, shortcut: 'i', tone: 'info' },
  { to: '/notas', label: 'Notas', icon: NotebookPen, shortcut: 'n', tone: 'merged' },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays, shortcut: 'c', tone: 'info' },
  { to: '/standup', label: 'Standup', icon: MessageSquareText, shortcut: 's', tone: 'accent' },
]
