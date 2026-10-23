import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { LogOut, Moon, NotebookPen, Search, Sun } from 'lucide-react'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Kbd } from '@/components/ui/kbd'
import { useLogout } from '@/features/auth/queries'
import { useCreateNote } from '@/features/notes/queries'
import { NAV_ITEMS } from '@/lib/navigation'
import { useTheme } from '@/lib/theme'

interface PaletteContextValue {
  open: () => void
}

const PaletteContext = createContext<PaletteContextValue | null>(null)

export function useCommandPalette(): PaletteContextValue {
  const context = useContext(PaletteContext)
  if (!context) throw new Error('useCommandPalette precisa de <CommandPaletteProvider>')
  return context
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setIsOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const value = useMemo(() => ({ open: () => setIsOpen(true) }), [])

  return (
    <PaletteContext value={value}>
      {children}
      <CommandPalette open={isOpen} onOpenChange={setIsOpen} />
    </PaletteContext>
  )
}

const itemClass =
  'flex h-9 cursor-default items-center gap-3 rounded-md px-2.5 text-sm text-fg-muted select-none data-[selected=true]:bg-elevated data-[selected=true]:text-fg [&_svg]:size-4'

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { resolved, toggle } = useTheme()
  const logout = useLogout()
  const createNote = useCreateNote()

  const run = useCallback(
    (action: () => void) => {
      onOpenChange(false)
      action()
    },
    [onOpenChange],
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-[18vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface shadow-pop animate-pop-in"
        >
          <Dialog.Title className="sr-only">Paleta de comandos</Dialog.Title>
          <Command loop className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 text-fg-subtle" />
              <Command.Input
                autoFocus
                placeholder="O que você procura?"
                className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle">
              <Command.Empty className="py-10 text-center text-sm text-fg-subtle">
                Nada encontrado.
              </Command.Empty>

              <Command.Group heading="Ir para">
                {NAV_ITEMS.map(({ to, label, icon: Icon, shortcut }) => (
                  <Command.Item
                    key={to}
                    value={`ir ${label}`}
                    onSelect={() => run(() => void navigate({ to }))}
                    className={itemClass}
                  >
                    <Icon />
                    <span className="flex-1">{label}</span>
                    <span className="flex gap-0.5">
                      <Kbd>g</Kbd>
                      <Kbd>{shortcut}</Kbd>
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Criar">
                <Command.Item
                  value="nova nota criar anotar"
                  onSelect={() =>
                    run(() =>
                      createNote.mutate(
                        {},
                        {
                          onSuccess: (note) =>
                            void navigate({ to: '/notas', search: { nota: note.id } }),
                        },
                      ),
                    )
                  }
                  className={itemClass}
                >
                  <NotebookPen />
                  Nova nota
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Preferências">
                <Command.Item
                  value="alternar tema claro escuro"
                  onSelect={() => run(toggle)}
                  className={itemClass}
                >
                  {resolved === 'dark' ? <Sun /> : <Moon />}
                  Usar tema {resolved === 'dark' ? 'claro' : 'escuro'}
                </Command.Item>
                <Command.Item
                  value="sair logout"
                  onSelect={() => run(() => logout.mutate())}
                  className={itemClass}
                >
                  <LogOut />
                  Sair
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
