import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/cn'
import { t } from '@/lib/i18n'
import { returnFocus } from '@/lib/return-focus'
import { useMediaQuery } from '@/lib/use-media-query'
import { type Box, type Side, placeCard } from './tour-position'
import { requestCount, subscribeWelcome } from './welcome-store'

/**
 * Primeiros passos: um tour guiado na primeira visita. Cada passo acende o
 * elemento de que fala (data-tour="..." no Hoje e na barra superior) e mostra
 * um cartão ao lado, com seta. Sem o elemento na tela, o cartão vai para o
 * meio; no celular, vira uma folha embaixo. Aparece uma vez por navegador e
 * volta pelo menu do usuário ("Primeiros passos").
 */

const SEEN_KEY = 'devdesk:boas-vindas'
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
/** Folga do destaque em volta do elemento. */
const PAD = 6

interface Step {
  /** Valor do data-tour do elemento destacado. */
  anchor: string
  /** Lados do elemento onde o cartão pode ficar, por preferência. */
  sides: Side[]
  title: string
  body: ReactNode
}

const STEPS: Step[] = [
  {
    anchor: 'precisa-de-voce',
    sides: ['right', 'bottom', 'left', 'top'],
    title: t('Comece pelo Hoje'),
    body: t(
      'Em “Precisa de você” ficam as reviews pedidas a você e os seus PRs travados: com conflito, CI quebrado ou mudanças pedidas. Nos seus PRs parados há um lembrete pronto para quem revisa.',
    ),
  },
  {
    anchor: 'navegacao',
    sides: ['bottom', 'top'],
    title: t('Tudo a um clique'),
    body: (
      <>
        {t('Pull requests, issues, notas, calendário, métricas e standup ficam aqui em cima.')}{' '}
        <Kbd>g</Kbd> {t('e uma letra navegam:')} <Kbd>g</Kbd> <Kbd>p</Kbd> {t('pull requests')},{' '}
        <Kbd>g</Kbd> <Kbd>n</Kbd> {t('notas')}, <Kbd>g</Kbd> <Kbd>h</Kbd> {t('de volta ao Hoje')}.
      </>
    ),
  },
  {
    anchor: 'busca',
    sides: ['bottom', 'left'],
    title: t('Pelo teclado'),
    body: (
      <>
        {isMac ? <Kbd>⌘</Kbd> : <Kbd>Ctrl</Kbd>} <Kbd>K</Kbd> {t('abre a busca de qualquer lugar.')}{' '}
        <Kbd>/</Kbd> {t('procura direto em PRs, issues, notas e eventos, e')} <Kbd>?</Kbd>{' '}
        {t('mostra todos os atalhos.')}
      </>
    ),
  },
  {
    anchor: 'menu-do-usuario',
    sides: ['bottom', 'left'],
    title: t('Deixe à vista'),
    body: t(
      'No seu menu ficam o modo TV, para uma tela grande, e o modo foco, com um cronômetro para o item mais urgente. Dali também se ligam as notificações, e estes primeiros passos voltam por lá.',
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

interface Spot extends Box {
  radius: number
  viewport: { width: number; height: number }
}

const sameSpot = (a: Spot | null, b: Spot | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height &&
    a.radius === b.radius &&
    a.viewport.width === b.viewport.width &&
    a.viewport.height === b.viewport.height)

/**
 * Onde está o elemento do passo, já com a folga do destaque. Mede de novo ao
 * redimensionar, rolar ou quando a página muda (dados chegando, rota nova).
 * null quando ele não existe ou está escondido.
 */
function useSpot(anchor: string | null, mobile: boolean): Spot | null {
  const [spot, setSpot] = useState<Spot | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    const resize = new ResizeObserver(schedule)
    resize.observe(document.documentElement)
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true })

    // Mantém o elemento na tela, mesmo se a página ainda estiver carregando e
    // ele mudar de lugar (a rolagem fica travada enquanto o tour está aberto).
    // No celular a folha cobre a parte de baixo: o elemento sobe para o topo.
    let observed: HTMLElement | null = null
    const reveal = (element: HTMLElement) => {
      if (element !== observed) resize.observe((observed = element))
      const { top, bottom } = element.getBoundingClientRect()
      if (mobile) {
        if (top < PAD * 2 || top > window.innerHeight * 0.35) window.scrollBy({ top: top - 16 })
      } else if (top < 0 || (bottom > window.innerHeight && bottom - top < window.innerHeight)) {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }

    function measure() {
      const element = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)
      if (element) reveal(element)
      const rect = element?.getBoundingClientRect()
      const next: Spot | null =
        element && rect && rect.width > 0 && rect.height > 0
          ? {
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              radius:
                Math.min(
                  parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0,
                  rect.height / 2,
                ) + PAD,
              viewport: { width: window.innerWidth, height: window.innerHeight },
            }
          : null
      setSpot((previous) => (sameSpot(previous, next) ? previous : next))
    }
    measure()

    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true })
    }
  }, [anchor, mobile])

  return spot
}

/** Seta do cartão: um quadradinho girado na borda voltada para o elemento. */
const ARROW: Record<Side, string> = {
  right: '-left-[7px] border-b border-l',
  left: '-right-[7px] border-t border-r',
  bottom: '-top-[7px] border-t border-l',
  top: '-bottom-[7px] border-r border-b',
}

export function WelcomeTour() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const asked = useSyncExternalStore(subscribeWelcome, requestCount, () => 0)
  // Primeira visita: abre sozinho até ser fechado. Depois, só por pedido novo.
  // No modo TV, nunca (ninguém está mexendo).
  const [closedAt, setClosedAt] = useState<number | null>(() => (seen() ? 0 : null))
  const [step, setStep] = useState(0)
  const open = pathname !== '/tv' && (closedAt === null || asked > closedAt)
  const mobile = useMediaQuery('(max-width: 639px)')
  const reduceMotion = useReducedMotion()
  const contentRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const [card, setCard] = useState({ width: 340, height: 220 })

  const current = STEPS[step]!
  const last = step === STEPS.length - 1
  const spot = useSpot(open ? current.anchor : null, mobile)

  // O tour fala do Hoje: pedido de outra página (menu do usuário), vai para lá.
  useEffect(() => {
    if (open && pathname !== '/') void navigate({ to: '/' })
  }, [open, pathname, navigate])

  // Tamanho do cartão, para saber de que lado ele cabe.
  useLayoutEffect(() => {
    const element = cardRef.current
    if (!open || !element) return
    const measure = () => {
      const { offsetWidth: width, offsetHeight: height } = element
      setCard((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [open, mobile])

  // "Voltar" some no primeiro passo: se o foco estava nele, vai para o principal.
  useEffect(() => {
    const active = document.activeElement
    if (open && (!active || !contentRef.current?.contains(active))) primaryRef.current?.focus()
  }, [open, step])

  const close = () => {
    markSeen()
    setClosedAt(requestCount())
    setStep(0)
  }
  const go = (next: number) => setStep(Math.min(Math.max(next, 0), STEPS.length - 1))

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(step + 1)
    else if (event.key === 'ArrowLeft') go(step - 1)
    else return
    event.preventDefault()
  }

  const anchored = spot !== null && !mobile
  const place = anchored ? placeCard(spot, card, spot.viewport, current.sides) : null

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-overlay-in">
          {spot ? (
            // Destaque: um recorte no escurecido, com anel lavanda.
            <div
              aria-hidden
              className="pointer-events-none fixed shadow-[0_0_0_200vmax_rgb(0_0_0/0.7)] ring-2 ring-accent transition-[top,left,width,height,border-radius] duration-300 ease-out"
              style={{
                top: spot.top,
                left: spot.left,
                width: spot.width,
                height: spot.height,
                borderRadius: spot.radius,
              }}
            />
          ) : (
            <div aria-hidden className="absolute inset-0 bg-black/70" />
          )}
        </Dialog.Overlay>
        <Dialog.Content
          ref={contentRef}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            primaryRef.current?.focus()
          }}
          onCloseAutoFocus={(event) => {
            returnFocus(event)
            // Pedido pelo menu: o item do menu já sumiu, o foco volta ao avatar.
            if (event.defaultPrevented || asked === 0) return
            event.preventDefault()
            document.querySelector<HTMLElement>('[data-tour="menu-do-usuario"]')?.focus()
          }}
          // Clique fora não fecha: escapa sem querer. Para sair há Pular e Esc.
          onInteractOutside={(event) => event.preventDefault()}
          onKeyDown={onKeyDown}
          className={cn(
            'fixed z-50 outline-none',
            mobile
              ? 'inset-x-0 bottom-0'
              : place
                ? 'w-[340px]'
                : 'top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2',
          )}
          style={place ? { top: place.top, left: place.left } : undefined}
        >
          <div
            ref={cardRef}
            className={cn(
              'relative border-border bg-surface shadow-pop',
              mobile
                ? 'rounded-t-lg border-t px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]'
                : 'rounded-lg border p-5',
            )}
          >
            {place && (
              <span
                aria-hidden
                className={cn(
                  'absolute size-3 rotate-45 border-border bg-surface',
                  ARROW[place.side],
                )}
                style={
                  place.side === 'left' || place.side === 'right'
                    ? { top: place.arrow - 6 }
                    : { left: place.arrow - 6 }
                }
              />
            )}
            <p className="font-mono text-[11px] text-fg-subtle">
              {t('Primeiros passos · {step} de {total}', { step: step + 1, total: STEPS.length })}
            </p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.16 }}
              >
                <Dialog.Title className="mt-2 text-[16px] font-semibold text-fg">
                  {current.title}
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-[14px] leading-relaxed text-fg-muted">
                  {current.body}
                </Dialog.Description>
              </motion.div>
            </AnimatePresence>
            {/* O título muda sem o foco sair do botão: o leitor de tela ouve por aqui. */}
            <p className="sr-only" aria-live="polite">
              {t('{step} de {total}: {titulo}', {
                step: step + 1,
                total: STEPS.length,
                titulo: current.title,
              })}
            </p>
            <div className="mt-5 flex items-center gap-2">
              {!last && (
                <Button variant="ghost" size="sm" className="-ml-3" onClick={close}>
                  {t('Pular')}
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                {step > 0 && (
                  <Button variant="outline" size="sm" onClick={() => go(step - 1)}>
                    {t('Voltar')}
                  </Button>
                )}
                <Button ref={primaryRef} size="sm" onClick={() => (last ? close() : go(step + 1))}>
                  {last ? t('Concluir') : t('Próximo')}
                </Button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
