import * as Dialog from '@radix-ui/react-dialog'
import { Keyboard, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { t } from '@/lib/i18n'
import { NAV_ITEMS } from '@/lib/navigation'

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

const GENERAL: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: t('Paleta de comandos: ir para qualquer lugar') },
  { keys: ['/'], label: t('Buscar PRs, issues, notas e eventos') },
  { keys: ['j', 'k'], label: t('Próximo e anterior na lista') },
  { keys: ['o'], label: t('Abrir no GitHub') },
  { keys: ['?'], label: t('Esta ajuda') },
  { keys: ['Esc'], label: t('Fechar diálogo ou menu') },
  { keys: ['F'], label: t('Tela cheia, no modo TV') },
]

/** "?" abre a lista de atalhos, como no GitHub. */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '?' || event.metaKey || event.ctrlKey || isTyping(event.target)) return
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return
      event.preventDefault()
      setOpen(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed top-[10vh] left-1/2 z-50 max-h-[80vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-y-auto rounded-lg border border-border bg-surface shadow-pop animate-pop-in">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <Dialog.Title className="flex items-center gap-2 text-sm font-semibold">
              <Keyboard className="size-4 text-fg-muted" /> {t('Atalhos de teclado')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t('Fechar')}>
                <X />
              </Button>
            </Dialog.Close>
          </header>
          <Dialog.Description className="px-4 pt-3 text-[13px] text-fg-muted">
            {t('Aperte')} <Kbd>g</Kbd> {t('e, logo depois, a letra da página.')}
          </Dialog.Description>
          <div className="grid gap-x-6 px-4 py-3 sm:grid-cols-2">
            <ShortcutList
              title={t('Ir para')}
              items={NAV_ITEMS.map((item) => ({ keys: ['g', item.shortcut], label: item.label }))}
            />
            <ShortcutList title={t('Geral')} items={GENERAL} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ShortcutList({
  title,
  items,
}: {
  title: string
  items: { keys: string[]; label: string }[]
}) {
  return (
    <section className="py-1">
      <h3 className="mb-1.5 text-[11px] font-medium text-fg-subtle uppercase">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="text-fg-muted">{item.label}</span>
            <span className="flex shrink-0 gap-1">
              {item.keys.map((key) => (
                <Kbd key={key}>{key}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
