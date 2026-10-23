import { CircleDot, GitMerge, GitPullRequest } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'

/**
 * Ilustração estática do painel "Hoje", só para a tela de login.
 * Os itens são de exemplo e a moldura diz isso.
 */
const ROWS = [
  {
    icon: GitPullRequest,
    tone: 'text-success',
    repo: 'checkout-api',
    number: 482,
    title: 'Retentativa com backoff no webhook de pagamento',
    meta: 'review pedida a você',
    status: 'aguardando você',
  },
  {
    icon: GitPullRequest,
    tone: 'text-success',
    repo: 'web-app',
    number: 1290,
    title: 'Migra a tabela de pedidos para paginação por cursor',
    meta: 'seu PR · 2 aprovações',
    status: 'CI passou',
  },
  {
    icon: CircleDot,
    tone: 'text-accent',
    repo: 'web-app',
    number: 1301,
    title: 'Filtro de data some ao voltar da página de detalhes',
    meta: 'atribuída a você',
    status: 'bug',
  },
  {
    icon: GitMerge,
    tone: 'text-fg-subtle',
    repo: 'infra',
    number: 77,
    title: 'Atualiza o Postgres do staging para a 17',
    meta: 'mergeado ontem',
    status: 'mergeado',
  },
]

export function ProductPreview() {
  return (
    <figure className="w-full max-w-xl">
      <div className="overflow-hidden rounded-lg border border-border-strong bg-surface shadow-pop">
        <div className="flex h-10 items-center justify-between border-b border-border px-4">
          <span className="text-[13px] font-semibold">Precisa da sua atenção</span>
          <span className="font-mono text-[11px] text-fg-subtle">4 itens</span>
        </div>
        <ul className="divide-y divide-border">
          {ROWS.map((row, index) => (
            <motion.li
              key={row.number}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.07, duration: 0.3, ease: 'easeOut' }}
              className="flex items-start gap-3 px-4 py-3"
            >
              <row.icon className={cn('mt-0.5 size-4 shrink-0', row.tone)} strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">{row.title}</p>
                <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">
                  {row.repo}#{row.number} · {row.meta}
                </p>
              </div>
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
                {row.status}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-[12px] text-fg-subtle">
        Exemplo ilustrativo do painel. Com a sua conta, a lista vem dos seus repositórios.
      </figcaption>
    </figure>
  )
}
