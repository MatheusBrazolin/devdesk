import { cn } from '@/lib/cn'
import { LANGUAGE, LANGUAGES, setLanguage } from '@/lib/i18n'

/**
 * Português ou inglês, em pílula como a navegação. Trocar recarrega a página
 * (datas e textos mudam juntos), com a tela esmaecendo em vez de piscar.
 */
export function LanguageSwitch({ className }: { className?: string }) {
  return (
    <div
      role="radiogroup"
      aria-label="Idioma / Language"
      className={cn(
        'inline-flex w-fit items-center gap-0.5 rounded-full border border-border bg-surface p-1',
        className,
      )}
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
              'q-ease inline-flex h-8 items-center rounded-full px-3.5 text-[13px] leading-none',
              active
                ? 'bg-elevated font-semibold text-fg'
                : 'text-fg-muted hover:bg-elevated/60 hover:text-fg',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
