import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { meQuery } from '@/features/auth/queries'
import { githubTokenQuery, useSaveGitHubToken } from './queries'
import { TokenConnectForm, TokenSteps } from './token-connect'

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

  if (user.isDemo) {
    return (
      <p className="px-4 py-3 text-[13px] text-fg-muted">
        No modo demonstração os dados são de exemplo. Entrando com o GitHub, aqui você liga um token
        pessoal para ver os repositórios da sua empresa.
      </p>
    )
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
      <TokenSteps />
      <TokenConnectForm id="token-pessoal" />
      <p className="text-[12px] text-fg-subtle">
        O token fica cifrado (AES-256-GCM) e só é usado para ler. O DevDesk nunca comenta, aprova
        nem faz merge, e você pode remover ou revogar o token a qualquer hora.
      </p>
    </div>
  )
}
