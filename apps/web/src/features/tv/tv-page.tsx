import { getRouteApi, Link } from '@tanstack/react-router'
import { AppWindow, Check, LayoutGrid, Maximize, Minimize, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChartTooltipProvider } from '@/components/charts/chart-tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/cn'
import { TvBoard } from './tv-board'
import {
  type ScreenArea,
  TV_LAYOUTS,
  type TvLayoutChoice,
  useTvFrame,
  WINDOW_PRESETS,
  type WindowPreset,
} from './tv-scale'
import { useFullscreen, useIdle, useWakeLock } from './use-screen-presence'

const route = getRouteApi('/app/tv')

/**
 * Modo TV: o painel para deixar aberto, em tela cheia numa TV ou numa
 * janela ao lado do trabalho. O arranjo segue o formato da janela (ou o que a
 * pessoa escolher) e é ampliado para caber sem rolar. Atualiza sozinho (o
 * painel busca o GitHub a cada dois minutos), mantém a tela acesa e esconde
 * cursor e controles parados. Sempre no tema escuro: numa sala, tela clara
 * cansa e ofusca.
 */
export function TvPage() {
  const { layout: choice = 'auto' } = route.useSearch()
  const navigate = route.useNavigate()
  const frame = useTvFrame(choice)
  const idle = useIdle()
  // Com um menu aberto, os controles não podem sumir debaixo do mouse.
  const [menuOpen, setMenuOpen] = useState(false)
  const hidden = idle && !menuOpen
  const fullscreen = useFullscreen()
  useWakeLock()

  // F alterna a tela cheia.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'f' && !event.metaKey && !event.ctrlKey) fullscreen.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const choose = (layout: TvLayoutChoice) =>
    void navigate({ search: layout === 'auto' ? {} : { layout }, replace: true })

  return (
    <div
      className={cn('dark fixed inset-0 overflow-hidden bg-bg text-fg', hidden && 'cursor-none')}
    >
      <div
        // O arranjo é desenhado num quadro fixo e ampliado: o texto cresce com a tela.
        style={{ width: frame.width, height: frame.height, zoom: frame.scale }}
        className={frame.layout === 'grade' ? 'p-5' : 'p-3'}
      >
        <ChartTooltipProvider>
          <TvBoard layout={frame.layout} />
        </ChartTooltipProvider>
      </div>

      <motion.div
        animate={{ opacity: hidden ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className={cn(
          // Embaixo, longe do relógio; somem com o mouse parado.
          'fixed right-3 bottom-3 flex gap-1.5',
          hidden && 'pointer-events-none',
        )}
      >
        <DropdownMenu onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger className={CONTROL}>
            <LayoutGrid className="size-4" />
            <span className="hidden sm:inline">
              {TV_LAYOUTS.find((option) => option.value === choice)?.label}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-60">
            <DropdownMenuLabel>Arranjo</DropdownMenuLabel>
            {TV_LAYOUTS.map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => choose(option.value)}>
                <Check className={cn(option.value !== choice && 'invisible')} />
                <span className="flex flex-col">
                  <span>{option.label}</span>
                  <span className="text-[11px] text-fg-subtle">
                    {option.value === 'auto' && choice === 'auto'
                      ? `agora: ${TV_LAYOUTS.find((o) => o.value === frame.layout)?.label.toLowerCase()}`
                      : option.hint}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger className={CONTROL}>
            <AppWindow className="size-4" />
            <span className="hidden sm:inline">Abrir em janela</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-60">
            <DropdownMenuLabel>Janela à parte, já no lugar</DropdownMenuLabel>
            {WINDOW_PRESETS.map((preset) => (
              <DropdownMenuItem key={preset.id} onSelect={() => openWindow(preset)}>
                {preset.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <p className="px-2 pb-1.5 text-[11px] leading-snug text-fg-subtle">
              Depois de aberta, arraste e redimensione à vontade: o arranjo acompanha.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>

        {fullscreen.supported && (
          <button type="button" onClick={fullscreen.toggle} className={CONTROL}>
            {fullscreen.on ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            <span className="hidden sm:inline">
              {fullscreen.on ? 'Sair da tela cheia' : 'Tela cheia'}
            </span>
            <kbd className="hidden font-mono text-[11px] text-fg-subtle sm:inline">F</kbd>
          </button>
        )}
        <Link
          to="/"
          aria-label="Sair do modo TV"
          className={cn(CONTROL, 'px-0 w-9 justify-center')}
        >
          <X className="size-4" />
        </Link>
      </motion.div>
    </div>
  )
}

const CONTROL =
  'flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface/90 px-3 text-[13px] font-medium backdrop-blur hover:bg-elevated data-[state=open]:bg-elevated'

/** A área útil da tela (sem a barra de tarefas ou o Dock), onde a janela vai. */
function screenArea(): ScreenArea {
  const screen = window.screen as Screen & { availLeft?: number; availTop?: number }
  return {
    left: screen.availLeft ?? 0,
    top: screen.availTop ?? 0,
    width: screen.availWidth,
    height: screen.availHeight,
  }
}

/**
 * Abre (ou reposiciona, se já aberta) a janela do modo TV no lugar escolhido.
 * Uma janela só, pelo nome: escolher outra posição move a mesma.
 */
function openWindow(preset: WindowPreset) {
  const place = preset.place(screenArea())
  const features = `popup=yes,left=${place.left},top=${place.top},width=${place.width},height=${place.height}`
  const win = window.open(`/tv?layout=${preset.layout}`, 'devdesk-tv', features)
  if (!win) {
    toast.error('O navegador bloqueou a janela', {
      description: 'Libere as janelas pop-up deste site e tente de novo.',
    })
    return
  }
  try {
    // Se a janela já existia, o open só troca o endereço: move e redimensiona.
    win.moveTo(place.left, place.top)
    win.resizeTo(place.width, place.height)
  } catch {
    // Alguns navegadores não deixam mover: a janela fica onde está.
  }
  win.focus()
}
