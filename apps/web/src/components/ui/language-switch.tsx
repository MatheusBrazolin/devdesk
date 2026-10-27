import { LANGUAGE, LANGUAGES, setLanguage } from '@/lib/i18n'
import { cn } from '@/lib/cn'

/** Português ou inglês. Trocar recarrega a página, para datas e textos mudarem juntos. */
export function LanguageSwitch({ className }: { className?: string }) {
  return (
    <div
      role="radiogroup"
      aria-label="Idioma / Language"
      className={cn('flex w-fit rounded-md border border-border p-0.5', className)}
    >
      {LANGUAGES.map((option) => {
        const active = option.value === LANGUAGE
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            lang={option.value}
            onClick={() => !active && setLanguage(option.value)}
            className={cn(
              'h-7 rounded px-2.5 text-[12px] transition-colors',
              active ? 'bg-elevated font-medium text-fg' : 'text-fg-muted hover:text-fg',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
