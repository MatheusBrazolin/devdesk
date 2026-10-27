import {
  CalendarDays,
  CalendarRange,
  ChartColumn,
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
import { t } from './i18n'

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
    | '/semana'
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
  { to: '/', label: t('Hoje'), icon: Sun, shortcut: 'h', tone: 'accent' },
  {
    to: '/foco',
    label: t('Foco'),
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
  { to: '/notas', label: t('Notas'), icon: NotebookPen, shortcut: 'n', tone: 'merged' },
  { to: '/calendario', label: t('Calendário'), icon: CalendarDays, shortcut: 'c', tone: 'info' },
  { to: '/metricas', label: t('Métricas'), icon: ChartColumn, shortcut: 'm', tone: 'merged' },
  { to: '/time', label: t('Time'), icon: Users, shortcut: 'e', tone: 'success' },
  { to: '/semana', label: t('Semana'), icon: CalendarRange, shortcut: 'w', tone: 'merged' },
  {
    to: '/standup',
    label: 'Standup',
    icon: MessageSquareText,
    shortcut: 's',
    tone: 'accent',
    hiddenFromSidebar: true,
  },
  {
    to: '/tv',
    label: t('Modo TV'),
    icon: Tv,
    shortcut: 't',
    tone: 'info',
    hiddenFromSidebar: true,
  },
  {
    to: '/configuracoes',
    label: t('Configurações'),
    icon: Settings,
    shortcut: 'o',
    tone: 'accent',
    hiddenFromSidebar: true,
  },
]
