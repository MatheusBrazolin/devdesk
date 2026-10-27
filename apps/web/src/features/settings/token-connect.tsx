import { connectGitHubTokenInputSchema } from '@devdesk/shared'
import { ExternalLink, KeyRound, Loader2 } from 'lucide-react'
import { type ClipboardEvent, type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { NEW_TOKEN_URL, useSaveGitHubToken } from './queries'

/** Os passos para gerar o token no GitHub. O link já abre com os escopos marcados. */
export function TokenSteps() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-[13px] text-fg-muted marker:text-fg-subtle">
      <li>
        <a
          href={NEW_TOKEN_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-fg underline underline-offset-2"
        >
          Abra o GitHub <ExternalLink className="size-3" />
        </a>
        : nome e permissões (<code className="font-mono text-[12px]">repo</code>,{' '}
        <code className="font-mono text-[12px]">read:org</code>) já vêm preenchidos. Clique em
        &quot;Generate token&quot; e copie.
      </li>
      <li>Volte aqui e cole o token no campo abaixo: ele conecta sozinho.</li>
      <li className="text-fg-subtle">
        Se a empresa usa SSO, clique em &quot;Configure SSO&quot; ao lado do token no GitHub e
        autorize.
      </li>
    </ol>
  )
}

/**
 * Campo do token. Colar já conecta: não precisa apertar nada. O botão fica
 * para quem digita ou cola de outro jeito.
 */
export function TokenConnectForm({ id, onConnected }: { id: string; onConnected?: () => void }) {
  const save = useSaveGitHubToken()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  const connect = (value: string) => {
    const parsed = connectGitHubTokenInputSchema.safeParse({ token: value })
    if (!parsed.success) return setError('Cole um token que comece com ghp_ ou github_pat_.')
    setError(null)
    save.mutate(parsed.data.token, {
      onSuccess: () => {
        setDraft('')
        toast.success('GitHub conectado', { description: 'Buscando tudo de novo.' })
        onConnected?.()
      },
      onError: (e) => setError(e.message),
    })
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    connect(draft)
  }

  const paste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text').trim()
    if (!connectGitHubTokenInputSchema.safeParse({ token: pasted }).success) return
    event.preventDefault()
    setDraft(pasted)
    connect(pasted)
  }

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <label className="sr-only" htmlFor={id}>
          Token pessoal do GitHub
        </label>
        <input
          id={id}
          type="password"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onPaste={paste}
          placeholder="Cole o token aqui (ghp_…)"
          spellCheck={false}
          autoComplete="off"
          disabled={save.isPending}
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 font-mono text-[12px] focus:border-border-strong focus:outline-none disabled:opacity-60"
        />
        <Button type="submit" disabled={!draft.trim() || save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          {save.isPending ? 'Conectando' : 'Conectar'}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
