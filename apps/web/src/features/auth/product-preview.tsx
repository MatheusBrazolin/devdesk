import { CircleDot, GitMerge, GitPullRequest } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { plural, t } from '@/lib/i18n'

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
    title: t('Retentativa com backoff no webhook de pagamento'),
    meta: t('review pedida a você'),
    status: t('aguardando você'),
  },
  {
    icon: GitPullRequest,
    tone: 'text-success',
    repo: 'web-app',
    number: 1290,
    title: t('Migra a tabela de pedidos para paginação por cursor'),
    meta: t('seu PR · 2 aprovações'),
    status: t('CI passou'),
  },
  {
    icon: CircleDot,
    tone: 'text-accent',
    repo: 'web-app',
    number: 1301,
    title: t('Filtro de data some ao voltar da página de detalhes'),
    meta: t('atribuída a você'),
    status: t('bug'),
  },
  {
    icon: GitMerge,
    tone: 'text-fg-subtle',
    repo: 'infra',
    number: 77,
    title: t('Atualiza o Postgres do staging para a 17'),
    meta: t('mergeado ontem'),
    status: t('mergeado'),
  },
]

export function ProductPreview() {
  return (
    <figure className="w-full max-w-xl">
      <div className="overflow-hidden rounded-q-panel border border-border bg-surface">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <span className="text-[15px] font-semibold">{t('Precisa da sua atenção')}</span>
          <span className="font-mono text-[11px] text-fg-subtle">
            {plural(ROWS.length, '{n} item', '{n} itens')}
          </span>
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
              <span className="inline-flex h-6 shrink-0 items-center rounded-full border border-border-strong px-2.5 text-[12px] font-semibold text-fg-muted">
                {row.status}
              </span>
            </motion.li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-3 text-[12px] text-fg-subtle">
        {t('Exemplo ilustrativo do painel. Com a sua conta, a lista vem dos seus repositórios.')}
      </figcaption>
    </figure>
  )
}
