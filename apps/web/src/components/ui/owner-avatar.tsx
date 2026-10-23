import { useState } from 'react'
import { cn } from '@/lib/cn'

/**
 * Avatar de uma organização ou usuário do GitHub, pelo login. Organizações
 * têm cantos retos no GitHub; aqui também, para distinguir de pessoas.
 */
export function OwnerAvatar({ owner, className }: { owner: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const base = cn('size-4 shrink-0 rounded-[4px]', className)

  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          base,
          'grid place-items-center bg-elevated text-[8px] font-semibold text-fg-subtle',
        )}
      >
        {owner[0]?.toUpperCase()}
      </span>
    )
  }
  return (
    <img
      src={`https://github.com/${encodeURIComponent(owner)}.png?size=40`}
      alt=""
      loading="lazy"
      className={cn(base, 'bg-elevated ring-1 ring-border')}
      onError={() => setFailed(true)}
    />
  )
}
