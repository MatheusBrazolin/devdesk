import { cn } from '@/lib/cn'

/** Marca monocromática: um "D" com um ponto de acento. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn('size-6', className)}>
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path
        d="M10 9h5.5a7 7 0 0 1 0 14H10z"
        fill="none"
        strokeWidth="2.6"
        strokeLinejoin="round"
        className="stroke-primary-fg"
      />
      <rect x="20.5" y="9" width="2.6" height="2.6" className="fill-accent" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className="text-sm font-semibold">DevDesk</span>
    </span>
  )
}
