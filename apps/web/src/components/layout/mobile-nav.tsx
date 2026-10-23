import * as Dialog from '@radix-ui/react-dialog'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { SidebarNav } from './sidebar-nav'
import { UserMenu } from './user-menu'

/** Em telas pequenas a sidebar vira uma gaveta. */
export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
          <Menu />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface px-3 py-3 shadow-pop animate-drawer-in">
          <div className="mb-4 flex items-center justify-between pl-1">
            <Logo />
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar menu">
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">Navegação</Dialog.Title>
          <Dialog.Description className="sr-only">Páginas do DevDesk</Dialog.Description>
          <SidebarNav layoutId="nav-active-mobile" onNavigate={() => setOpen(false)} />
          <div className="mt-auto">
            <UserMenu />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
