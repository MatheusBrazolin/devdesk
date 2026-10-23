import { useSuspenseQuery } from '@tanstack/react-query'
import { CalendarDays, Inbox, NotebookPen } from 'lucide-react'
import { motion } from 'motion/react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { meQuery } from '@/features/auth/queries'
import { cn } from '@/lib/cn'
import { firstName, formatLongDate, greetingFor } from '@/lib/greeting'

/**
 * Os números chegam com a sincronização do GitHub (fase 2). Até lá cada
 * célula mostra "—" em vez de um zero que pareceria verdade.
 */
const SUMMARY = [
  { label: 'Reviews pedidas', hint: 'aguardando você' },
  { label: 'PRs abertos', hint: 'de sua autoria' },
  { label: 'Issues', hint: 'atribuídas a você' },
  { label: 'Mergeados', hint: 'últimos 7 dias' },
]

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: 'easeOut' as const },
})

export function HomePage() {
  const { user } = useSuspenseQuery(meQuery).data
  const now = new Date()

  return (
    <div className="space-y-6">
      <motion.header {...fadeUp(0)}>
        <h1 className="text-xl font-semibold">
          {greetingFor(now)}, {firstName(user.name, user.login)}
        </h1>
        <p className="mt-0.5 text-[13px] text-fg-muted first-letter:uppercase">
          {formatLongDate(now)}
        </p>
      </motion.header>

      <motion.dl
        {...fadeUp(0.05)}
        className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface md:grid-cols-4"
      >
        {SUMMARY.map(({ label, hint }, index) => (
          <div
            key={label}
            className={cn(
              'border-border px-4 py-3',
              index % 2 === 1 && 'border-l',
              index >= 2 && 'border-t md:border-t-0',
              index === 2 && 'md:border-l',
            )}
          >
            <dt className="text-[12px] text-fg-muted">{label}</dt>
            <dd className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg text-fg-subtle" aria-label="sem dados ainda">
                —
              </span>
              <span className="text-[12px] text-fg-subtle">{hint}</span>
            </dd>
          </div>
        ))}
      </motion.dl>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <motion.div {...fadeUp(0.1)}>
          <Card>
            <CardHeader>
              <CardTitle>Precisa da sua atenção</CardTitle>
            </CardHeader>
            <EmptyState
              icon={Inbox}
              title="A lista ainda não está conectada"
              description="Quando a sincronização com o GitHub entrar, aparecem aqui os PRs que pedem a sua review, os seus PRs com CI quebrado ou com pedido de mudança e as issues novas atribuídas a você."
              className="py-10"
            />
          </Card>
        </motion.div>

        <motion.div {...fadeUp(0.15)} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agenda de hoje</CardTitle>
            </CardHeader>
            <EmptyState
              icon={CalendarDays}
              title="Nada marcado"
              description="Reuniões, lembretes e prazos de milestones vão aparecer aqui."
            />
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Notas fixadas</CardTitle>
            </CardHeader>
            <EmptyState
              icon={NotebookPen}
              title="Nenhuma nota"
              description="Notas rápidas e as ligadas a PRs e issues ficam à mão aqui."
            />
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
