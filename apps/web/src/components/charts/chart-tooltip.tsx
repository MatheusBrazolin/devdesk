import * as Tooltip from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

/**
 * Tooltip de marca de gráfico: abre no hover e no foco do teclado. O valor
 * vem primeiro e forte; o rótulo, depois e discreto. Nunca é o único lugar de
 * um valor: cada gráfico também escreve os valores e tem uma tabela.
 */
export function ChartTooltip({
  value,
  label,
  children,
}: {
  value: ReactNode
  label: ReactNode
  children: ReactNode
}) {
  return (
    <Tooltip.Root delayDuration={0}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          sideOffset={6}
          className="z-50 rounded-md border border-border bg-surface px-2.5 py-1.5 shadow-pop animate-pop-in"
        >
          <span className="block text-[13px] font-semibold text-fg">{value}</span>
          <span className="block text-[11px] text-fg-muted">{label}</span>
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

export const ChartTooltipProvider = Tooltip.Provider
