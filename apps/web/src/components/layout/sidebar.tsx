import { Logo } from '@/components/ui/logo'
import { SidebarNav } from './sidebar-nav'
import { UserMenu } from './user-menu'

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-border bg-surface px-3 lg:flex">
      <div className="flex h-12 items-center px-1">
        <Logo />
      </div>
      <p className="mt-3 mb-1.5 px-2.5 text-[11px] font-medium text-fg-subtle">
        Espaço de trabalho
      </p>
      <SidebarNav layoutId="nav-active" />
      <div className="mt-auto border-t border-border py-2">
        <UserMenu />
      </div>
    </aside>
  )
}
