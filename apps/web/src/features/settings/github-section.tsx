import { connectGitHubTokenInputSchema } from '@devdesk/shared'
import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { CheckCircle2, ExternalLink, KeyRound, Loader2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { meQuery } from '@/features/auth/queries'
import { NEW_TOKEN_URL, githubTokenQuery, useSaveGitHubToken } from './queries'

const savedFormat = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })

/**
 * De onde vêm os dados do GitHub. O login pelo OAuth não enxerga as
 * organizações que bloqueiam apps de terceiros; um token pessoal age como a
 * pessoa e mostra tudo o que ela vê no github.com, sem pedir nada à organização.
 */
export function GitHubSection() {
  const { user } = useSuspenseQuery(meQuery).data
  const status = useQuery({ ...githubTokenQuery, enabled: !user.isDemo })
  const save = useSaveGitHubToken()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (user.isDemo) {
    return (
      <p className="px-4 py-3 text-[13px] text-fg-muted">
        No modo demonstração os dados são de exemplo. Entrando com o GitHub, aqui você liga um token
        pessoal para ver os repositórios da sua empresa.
      </p>
    )
  }

  const connect = (event: FormEvent) => {
    event.preventDefault()
    const parsed = connectGitHubTokenInputSchema.safeParse({ token: draft })
    if (!parsed.success) return setError('Cole um token que comece com ghp_ ou github_pat_.')
    setError(null)
    save.mutate(parsed.data.token, {
      onSuccess: () => {
        setDraft('')
        toast.success('Token conectado', { description: 'O painel vai buscar tudo de novo.' })
      },
      onError: (e) => setError(e.message),
    })
  }

  const disconnect = () =>
    save.mutate(null, {
      onSuccess: () =>
        toast.success('Token removido', { description: 'Voltou para o login do GitHub.' }),
      onError: (e) => toast.error('Não removeu', { description: e.message }),
    })

  if (status.data?.connected) {
    return (
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <p className="flex min-w-0 flex-1 items-start gap-2 text-[13px] text-fg-muted">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
          <span>
            Os dados vêm do seu token pessoal
            {status.data.savedAt && (
              <>, conectado em {savedFormat.format(new Date(status.data.savedAt))}</>
            )}
            . Ele fica cifrado e nunca volta para o navegador.
          </span>
        </p>
        <Button variant="outline" disabled={save.isPending} onClick={disconnect}>
          {save.isPending && <Loader2 className="animate-spin" />}
          Remover token
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <p className="text-[13px] leading-relaxed text-fg-muted">
        Não aparecem os PRs e repositórios da sua empresa? Muitas organizações bloqueiam apps de
        terceiros, e o login pelo GitHub não enxerga o que é delas. Um token pessoal age como você e
        mostra o mesmo que o github.com, sem pedir nada à organização.
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-[13px] text-fg-muted marker:text-fg-subtle">
        <li>
          <a
            href={NEW_TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-fg underline underline-offset-2"
          >
            Gere um token classic <ExternalLink className="size-3" />
          </a>{' '}
          com <code className="font-mono text-[12px]">repo</code> e{' '}
          <code className="font-mono text-[12px]">read:org</code> marcados (o link já marca).
        </li>
        <li>
          Se a organização usa SSO, clique em &quot;Configure SSO&quot; ao lado do token e autorize.
        </li>
        <li>Cole o token aqui.</li>
      </ol>
      <form onSubmit={connect} className="flex gap-2">
        <label className="sr-only" htmlFor="token-pessoal">
          Token pessoal do GitHub
        </label>
        <input
          id="token-pessoal"
          type="password"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="ghp_…"
          spellCheck={false}
          autoComplete="off"
          className="h-8 min-w-0 flex-1 rounded-md border border-border bg-bg px-2.5 font-mono text-[12px] focus:border-border-strong focus:outline-none"
        />
        <Button type="submit" disabled={!draft.trim() || save.isPending}>
          {save.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />}
          Conectar
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <p className="text-[12px] text-fg-subtle">
        O token fica cifrado (AES-256-GCM) e só é usado para ler. O DevDesk nunca comenta, aprova
        nem faz merge, e você pode remover ou revogar o token a qualquer hora.
      </p>
    </div>
  )
}
