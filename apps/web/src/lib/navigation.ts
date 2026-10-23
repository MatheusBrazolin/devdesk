import {
  CalendarDays,
  CircleDot,
  GitPullRequest,
  type LucideIcon,
  NotebookPen,
  Sun,
} from 'lucide-react'

export interface NavItem {
  to: '/' | '/pull-requests' | '/issues' | '/notas' | '/calendario'
  label: string
  icon: LucideIcon
  /** Atalho "g + tecla", no estilo do GitHub e do Linear. */
  shortcut: string
}

/** Fonte única da navegação: a sidebar e a paleta de comandos leem daqui. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hoje', icon: Sun, shortcut: 'h' },
  { to: '/pull-requests', label: 'Pull requests', icon: GitPullRequest, shortcut: 'p' },
  { to: '/issues', label: 'Issues', icon: CircleDot, shortcut: 'i' },
  { to: '/notas', label: 'Notas', icon: NotebookPen, shortcut: 'n' },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays, shortcut: 'c' },
]
