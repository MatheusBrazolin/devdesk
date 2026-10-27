import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from '@tanstack/react-router'
import { Command } from 'cmdk'
import { Languages, LogOut, NotebookPen, Search } from 'lucide-react'
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
import { LANGUAGE, setLanguage, t } from '@/lib/i18n'
import { NAV_ITEMS } from '@/lib/navigation'
import { SearchResults } from './search-results'

interface PaletteContextValue {
  open: () => void
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

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
        return
      }
      // "/" abre direto na busca, como no GitHub, quando não se está escrevendo.
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !isTyping(event.target)) {
        if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
        event.preventDefault()
        setIsOpen(true)
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
  const logout = useLogout()
  const createNote = useCreateNote()
  const [search, setSearch] = useState('')
  const searching = search.trim().length >= 2

  // Fechou: a próxima abertura começa com a busca vazia.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (!open) setSearch('')
  }

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
          <Dialog.Title className="sr-only">{t('Paleta de comandos')}</Dialog.Title>
          <Command loop className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-4 text-fg-subtle" />
              <Command.Input
                autoFocus
                value={search}
                onValueChange={setSearch}
                placeholder={t('Busque PRs, issues, notas e eventos, ou vá para uma página')}
                className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle">
              <Command.Empty className="py-10 text-center text-sm text-fg-subtle">
                {t('Nada encontrado.')}
              </Command.Empty>

              {searching && <SearchResults query={search.trim()} itemClass={itemClass} run={run} />}

              <Command.Group heading={t('Ir para')}>
                {NAV_ITEMS.map(({ to, label, icon: Icon, shortcut }) => (
                  <Command.Item
                    key={to}
                    value={`ir go ${label}`}
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

              <Command.Group heading={t('Criar')}>
                <Command.Item
                  value="nova nota criar anotar new note create"
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
                  {t('Nova nota')}
                </Command.Item>
              </Command.Group>

              <Command.Group heading={t('Preferências')}>
                <Command.Item
                  value="idioma language english português ingles"
                  onSelect={() => run(() => setLanguage(LANGUAGE === 'en' ? 'pt-BR' : 'en'))}
                  className={itemClass}
                >
                  <Languages />
                  {LANGUAGE === 'en' ? 'Usar em português' : 'Use in English'}
                </Command.Item>
                <Command.Item
                  value="sair logout sign out"
                  onSelect={() => run(() => logout.mutate())}
                  className={itemClass}
                >
                  <LogOut />
                  {t('Sair')}
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
