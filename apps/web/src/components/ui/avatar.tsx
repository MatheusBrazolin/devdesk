import { useState } from 'react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/greeting'

interface AvatarProps {
  name: string | null
  login: string
  src: string | null
  className?: string
}

export function Avatar({ name, login, src, className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const base = cn('size-7 shrink-0 rounded-full', className)

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={cn(base, 'object-cover ring-1 ring-border')}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        base,
        'grid place-items-center border border-border-strong bg-elevated text-[10px] font-semibold text-fg-muted',
      )}
    >
      {initials(name, login)}
    </span>
  )
}
