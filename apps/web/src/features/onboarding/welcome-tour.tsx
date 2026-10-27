import * as Dialog from '@radix-ui/react-dialog'
import { useRouterState } from '@tanstack/react-router'
import { CalendarDays, Command, Inbox, type LucideIcon, Tv, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useState, useSyncExternalStore } from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/cn'
import { t } from '@/lib/i18n'
import { requestCount, subscribeWelcome } from './welcome-store'

/**
 * Primeiros passos: quatro telas curtas na primeira visita. Aparecem uma vez
 * por navegador e voltam pelo menu do usuário ("Primeiros passos").
 */

const SEEN_KEY = 'devdesk:boas-vindas'

interface Step {
  icon: LucideIcon
  iconClass: string
  title: string
  body: ReactNode
}

const STEPS: Step[] = [
  {
    icon: Inbox,
    iconClass: 'bg-accent/12 text-accent',
    title: t('Comece pelo Hoje'),
    body: t(
      'Em “Precisa da sua atenção” fica o que depende de você: reviews pedidas (as que destravam mais gente primeiro, com o tempo estimado), CI quebrado, conflitos e PRs prontos para merge. Nos seus PRs parados há um lembrete pronto para quem revisa.',
    ),
  },
  {
    icon: CalendarDays,
    iconClass: 'bg-info/12 text-info',
    title: t('Notas, agenda e standup'),
    body: t(
      'Notas em markdown com modelos prontos (review, deploy, 1:1) e ligadas a PRs e issues. A agenda junta seus eventos e os prazos das milestones, e o Standup monta o “ontem, hoje e bloqueios” sozinho.',
    ),
  },
  {
    icon: Tv,
    iconClass: 'bg-success/12 text-success',
    title: t('Deixe à vista'),
    body: t(
      'O modo TV mostra o essencial numa tela grande ou numa coluna ao lado do trabalho, e o modo foco dá um cronômetro para o item mais urgente. Instale o DevDesk como app pelo menu do usuário.',
    ),
  },
  {
    icon: Command,
    iconClass: 'bg-merged/12 text-merged',
    title: t('Pelo teclado'),
    body: (
      <>
        <Kbd>⌘</Kbd> <Kbd>K</Kbd> {t('abre a busca de qualquer lugar.')} <Kbd>g</Kbd>{' '}
        {t('e uma letra navegam:')} <Kbd>g</Kbd> <Kbd>p</Kbd> {t('pull requests')}, <Kbd>g</Kbd>{' '}
        <Kbd>n</Kbd> {t('notas')}, <Kbd>g</Kbd> <Kbd>t</Kbd> {t('modo TV')}.
      </>
    ),
  },
]

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) !== null
  } catch {
    return true
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, 'visto')
  } catch {
    // Sem armazenamento: o tour pode voltar na próxima visita, sem prejuízo.
  }
}

export function WelcomeTour() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const asked = useSyncExternalStore(subscribeWelcome, requestCount, () => 0)
  // Primeira visita: abre sozinho até ser fechado. Depois, só por pedido novo.
  // No modo TV, nunca (ninguém está mexendo).
  const [closedAt, setClosedAt] = useState<number | null>(() => (seen() ? 0 : null))
  const [step, setStep] = useState(0)
  const open = pathname !== '/tv' && (closedAt === null || asked > closedAt)

  const close = () => {
    markSeen()
    setClosedAt(requestCount())
    setStep(0)
  }
  const current = STEPS[step]!
  const last = step === STEPS.length - 1

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 animate-overlay-in" />
        <Dialog.Content className="fixed top-[14vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-border bg-surface p-6 shadow-pop animate-pop-in">
          <div className="flex items-start justify-between gap-4">
            <p className="font-mono text-[11px] text-fg-subtle">
              {t('Primeiros passos · {step} de {total}', { step: step + 1, total: STEPS.length })}
            </p>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t('Fechar')}>
                <X />
              </Button>
            </Dialog.Close>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              <span
                className={cn('mt-2 grid size-10 place-items-center rounded-lg', current.iconClass)}
              >
                <current.icon className="size-5" strokeWidth={2} />
              </span>
              <Dialog.Title className="mt-4 text-lg font-semibold">{current.title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-[14px] leading-relaxed text-fg-muted">
                {current.body}
              </Dialog.Description>
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex items-center justify-between">
            <div className="flex gap-1.5" aria-hidden>
              {STEPS.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === step ? 'w-5 bg-accent' : 'w-1.5 bg-border-strong',
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {!last && (
                <Button variant="ghost" onClick={close}>
                  {t('Pular')}
                </Button>
              )}
              <Button onClick={() => (last ? close() : setStep(step + 1))}>
                {last ? t('Começar') : t('Próximo')}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
