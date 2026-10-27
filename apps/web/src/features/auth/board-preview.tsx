import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/lib/i18n'

type Tag = 'review' | 'changes' | 'no_review' | 'approved'

interface PreviewCard {
  id: string
  title: string
  ref: string
  tag: Tag
}

const TAGS: Record<Tag, { label: string; className: string }> = {
  review: { label: t('Review pedida'), className: 'border-danger text-danger' },
  changes: { label: t('Mudanças pedidas'), className: 'border-danger text-danger' },
  no_review: { label: t('Sem review'), className: 'border-warning text-warning' },
  approved: { label: t('Aprovado'), className: 'border-accent text-accent' },
}

const CARD = {
  retry: { id: 'retry', title: t('Retentativa com backoff no webhook'), ref: 'checkout-api#482' },
  timezone: {
    id: 'timezone',
    title: t('Corrige o fuso horário do relatório'),
    ref: 'web-app#1275',
  },
  queue: { id: 'queue', title: t('Alerta de fila parada no worker'), ref: 'infra#84' },
  cursor: { id: 'cursor', title: t('Paginação por cursor nos pedidos'), ref: 'web-app#1290' },
}

const card = (base: Omit<PreviewCard, 'tag'>, tag: Tag): PreviewCard => ({ ...base, tag })

interface Frame {
  needsYou: PreviewCard[]
  stale: PreviewCard[]
  inProgress: PreviewCard[]
  /** Mergeados por dia, de quarta a hoje. */
  merged: number[]
}

/**
 * Um dia de trabalho em cinco quadros: a review é feita, a mudança pedida é
 * resolvida, os aprovados entram e o parado recebe resposta. Os cards trocam
 * de coluna e a barra de hoje cresce a cada merge.
 */
const FRAMES: Frame[] = [
  {
    needsYou: [card(CARD.retry, 'review'), card(CARD.timezone, 'changes')],
    stale: [card(CARD.queue, 'no_review')],
    inProgress: [card(CARD.cursor, 'approved')],
    merged: [1, 2, 0, 1, 0, 2, 0],
  },
  {
    needsYou: [card(CARD.timezone, 'changes')],
    stale: [card(CARD.queue, 'no_review')],
    inProgress: [card(CARD.retry, 'approved'), card(CARD.cursor, 'approved')],
    merged: [1, 2, 0, 1, 0, 2, 0],
  },
  {
    needsYou: [],
    stale: [card(CARD.queue, 'no_review')],
    inProgress: [
      card(CARD.timezone, 'approved'),
      card(CARD.retry, 'approved'),
      card(CARD.cursor, 'approved'),
    ],
    merged: [1, 2, 0, 1, 0, 2, 0],
  },
  {
    needsYou: [],
    stale: [card(CARD.queue, 'no_review')],
    inProgress: [card(CARD.timezone, 'approved'), card(CARD.retry, 'approved')],
    merged: [1, 2, 0, 1, 0, 2, 1],
  },
  {
    needsYou: [card(CARD.queue, 'changes')],
    stale: [],
    inProgress: [card(CARD.timezone, 'approved')],
    merged: [1, 2, 0, 1, 0, 2, 2],
  },
]

/** Quanto cada quadro fica na tela. */
const FRAME_MS = 2600

const DAYS = [t('qua'), t('qui'), t('sex'), t('sáb'), t('dom'), t('seg'), t('hoje')]

/**
 * O quadro do Hoje em miniatura, trabalhando sozinho: ilustração da tela de
 * login. Com movimento reduzido, fica parado no primeiro quadro. Para leitor
 * de tela, a legenda descreve; o quadro em si é decorativo.
 */
export function BoardPreview() {
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      // Aba escondida não anima: volta de onde parou.
      if (!document.hidden) setIndex((current) => (current + 1) % FRAMES.length)
    }, FRAME_MS)
    return () => window.clearInterval(id)
  }, [reduce])

  const frame = FRAMES[reduce ? 0 : index]!
  const max = Math.max(...frame.merged, 1)
  const total = frame.merged.reduce((sum, n) => sum + n, 0)

  return (
    <figure className="w-full max-w-[44rem]">
      <div aria-hidden className="flex flex-col gap-3">
        <LayoutGroup>
          <div className="grid grid-cols-3 gap-3">
            <Column title={t('Precisa de você')} dot="bg-danger" cards={frame.needsYou} />
            <Column title={t('Parados há +7 dias')} dot="bg-warning" cards={frame.stale} />
            <Column title={t('Em andamento')} dot="bg-accent" cards={frame.inProgress} />
          </div>
        </LayoutGroup>

        <div className="flex items-end gap-6 rounded-q-panel border border-border bg-surface p-4">
          <div className="shrink-0">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <span className="size-2 rounded-full bg-fg-subtle" />
              {t('Mergeados na semana')}
            </p>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.p
                key={total}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="mt-2 text-[34px] leading-none font-semibold tracking-tight text-accent"
              >
                {total}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex h-20 flex-1 items-end gap-2">
            {frame.merged.map((count, day) => {
              const today = day === frame.merged.length - 1
              return (
                <div
                  key={day}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                >
                  <motion.span
                    className={cn(
                      'w-full rounded-[5px]',
                      count === 0 ? 'bg-border-strong' : today ? 'bg-accent' : 'bg-accent/30',
                    )}
                    animate={{ height: count === 0 ? 3 : (count / max) * 56 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                  />
                  <span
                    className={cn(
                      'text-[11px]',
                      today ? 'font-semibold text-accent' : 'text-fg-subtle',
                    )}
                  >
                    {DAYS[day]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-[12px] text-fg-subtle">
        {t(
          'Exemplo ilustrativo: os PRs mudam de coluna conforme o trabalho anda. Com a sua conta, o quadro vem dos seus repositórios.',
        )}
      </figcaption>
    </figure>
  )
}

function Column({ title, dot, cards }: { title: string; dot: string; cards: PreviewCard[] }) {
  return (
    <section className="flex min-h-[27rem] flex-col gap-2.5 rounded-q-panel border border-border bg-surface p-3">
      <h3 className="flex items-center gap-2 px-1 pt-1 text-[13px] font-semibold">
        <span className={cn('size-2 shrink-0 rounded-full', dot)} />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <motion.span
          key={cards.length}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-full bg-elevated px-2 py-0.5 font-mono text-[11px] text-fg-muted"
        >
          {cards.length}
        </motion.span>
      </h3>
      <AnimatePresence mode="popLayout" initial={false}>
        {cards.map((item) => (
          <motion.div
            key={item.id}
            layoutId={item.id}
            layout
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="flex flex-col gap-2 rounded-q-card bg-elevated p-3"
          >
            <motion.span
              key={item.tag}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'w-fit rounded-full border px-2 py-[2px] text-[11px] leading-4 font-semibold',
                TAGS[item.tag].className,
              )}
            >
              {TAGS[item.tag].label}
            </motion.span>
            <span className="text-[13px] leading-snug font-medium">{item.title}</span>
            <span className="font-mono text-[11px] text-fg-subtle">{item.ref}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {cards.length === 0 && <p className="px-1 text-[12px] text-fg-subtle">{t('Tudo em dia.')}</p>}
    </section>
  )
}
