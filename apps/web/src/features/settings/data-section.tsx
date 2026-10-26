import { useSuspenseQuery } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { Download, Loader2, Trash2, X } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import { meQuery } from '@/features/auth/queries'
import { EXPORT_URL, useDeleteAccount } from './queries'

/** Levar os dados num arquivo e apagar a conta (LGPD). */
export function DataSection() {
  const { user } = useSuspenseQuery(meQuery).data
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="divide-y divide-border">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1 text-[13px] text-fg-muted">
          Um arquivo JSON com as suas notas, eventos, agendas conectadas e configurações.
        </p>
        <a
          href={EXPORT_URL}
          download={`devdesk-${user.login}-${new Date().toISOString().slice(0, 10)}.json`}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-[13px] font-medium hover:bg-elevated"
        >
          <Download className="size-4" /> Baixar meus dados
        </a>
      </div>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1 text-[13px] text-fg-muted">
          Apaga a conta e tudo o que é dela, na hora e sem volta. Nada muda no GitHub.
        </p>
        <Button
          variant="outline"
          className="text-danger hover:text-danger"
          onClick={() => setConfirming(true)}
        >
          <Trash2 /> Apagar minha conta
        </Button>
      </div>
      <DeleteAccountDialog login={user.login} open={confirming} onOpenChange={setConfirming} />
    </div>
  )
}

function DeleteAccountDialog({
  login,
  open,
  onOpenChange,
}: {
  login: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const remove = useDeleteAccount()
  const [typed, setTyped] = useState('')
  const matches = typed.trim().toLowerCase() === login.toLowerCase()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!matches) return
    // Sem conta, não há o que mostrar: volta para a entrada, já sem sessão.
    remove.mutate(typed, { onSuccess: () => window.location.assign('/login') })
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed top-[15vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-border bg-surface shadow-pop animate-pop-in">
          <form onSubmit={submit}>
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <Dialog.Title className="text-sm font-semibold">Apagar a conta</Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar">
                  <X />
                </Button>
              </Dialog.Close>
            </header>
            <div className="space-y-3 px-4 py-4 text-[13px]">
              <Dialog.Description className="text-fg-muted">
                Saem agora: sessões, token do GitHub, notas, eventos, agendas conectadas, avisos e
                configurações. Não dá para desfazer. Se quiser, baixe seus dados antes.
              </Dialog.Description>
              <label className="block space-y-1">
                <span className="text-[12px] text-fg-muted">
                  Digite <b className="font-mono text-fg">{login}</b> para confirmar
                </span>
                <input
                  value={typed}
                  onChange={(event) => setTyped(event.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  className="h-8 w-full rounded-md border border-border bg-bg px-2.5 font-mono text-[13px] focus:border-border-strong focus:outline-none"
                />
              </label>
              {remove.error && (
                <p role="alert" className="text-danger">
                  {remove.error.message}
                </p>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <Dialog.Close asChild>
                <Button variant="ghost">Cancelar</Button>
              </Dialog.Close>
              <Button
                type="submit"
                disabled={!matches || remove.isPending}
                className="bg-danger text-white hover:bg-danger/90"
              >
                {remove.isPending && <Loader2 className="animate-spin" />}
                Apagar de vez
              </Button>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
