import { cn } from '@/lib/cn'

/**
 * Marca do DevDesk: uma branch descendo até a `main` e as duas se juntando
 * num ponto de merge. Quadrado lavanda, traço em roxo bem escuro. O mesmo
 * desenho está no favicon e nos ícones do app (scripts/generate-icons.mjs).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-[30px] shrink-0', className)}>
      <rect width="32" height="32" rx="9" className="fill-q-accent" />
      <g className="stroke-q-on-accent" strokeWidth="2.6" strokeLinecap="round" fill="none">
        <path d="M7 21H19" />
        <path d="M7 11C14.5 11 13.5 21 19.5 21" />
      </g>
      <g className="fill-q-on-accent">
        <circle cx="7" cy="11" r="2.6" />
        <circle cx="7" cy="21" r="2.6" />
        <circle cx="22.5" cy="21" r="4.2" />
      </g>
      <circle cx="22.5" cy="21" r="1.6" className="fill-q-accent" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[20px] font-semibold tracking-tight">DevDesk</span>
    </span>
  )
}
