import {
  ChartColumn,
  CalendarDays,
  CircleDot,
  Crosshair,
  GitPullRequest,
  type LucideIcon,
  MessageSquareText,
  NotebookPen,
  Settings,
  Sun,
  Tv,
  Users,
} from 'lucide-react'
import type { Tone } from './tones'

export interface NavItem {
  to:
    | '/'
    | '/foco'
    | '/tv'
    | '/metricas'
    | '/time'
    | '/pull-requests'
    | '/issues'
    | '/notas'
    | '/calendario'
    | '/standup'
    | '/configuracoes'
  label: string
  icon: LucideIcon
  /** Atalho "g + tecla", no estilo do GitHub e do Linear. */
  shortcut: string
  /** Cor da seção: ícone na barra lateral e no cabeçalho da página. */
  tone: Tone
  /** Fora da barra lateral: entra pelo menu do usuário, pelo ⌘K e pelo atalho. */
  hiddenFromSidebar?: true
}

/** Fonte única da navegação: a sidebar e a paleta de comandos leem daqui. */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hoje', icon: Sun, shortcut: 'h', tone: 'accent' },
  {
    to: '/foco',
    label: 'Foco',
    icon: Crosshair,
    shortcut: 'f',
    tone: 'success',
    hiddenFromSidebar: true,
  },
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
  { to: '/metricas', label: 'Métricas', icon: ChartColumn, shortcut: 'm', tone: 'merged' },
  { to: '/time', label: 'Time', icon: Users, shortcut: 'e', tone: 'success' },
  {
    to: '/standup',
    label: 'Standup',
    icon: MessageSquareText,
    shortcut: 's',
    tone: 'accent',
    hiddenFromSidebar: true,
  },
  { to: '/tv', label: 'Modo TV', icon: Tv, shortcut: 't', tone: 'info', hiddenFromSidebar: true },
  {
    to: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    shortcut: 'o',
    tone: 'accent',
    hiddenFromSidebar: true,
  },
]
