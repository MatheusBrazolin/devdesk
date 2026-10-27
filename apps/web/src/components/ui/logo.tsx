import { cn } from '@/lib/cn'

/** Marca do Quadro: quadrado lima, raio 9, com o "D" no verde do fundo. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[30px] shrink-0 place-items-center rounded-q-logo bg-q-lime text-[16px] leading-none font-bold text-q-on-lime',
        className,
      )}
    >
      D
    </span>
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
