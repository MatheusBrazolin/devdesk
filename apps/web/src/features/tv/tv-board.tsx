import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { dashboardQuery } from '@/features/work/queries'
import { fadeUp } from '@/lib/motion'
import type { TvLayout } from './tv-scale'
import {
  AgePanel,
  AgendaPanel,
  KpiTiles,
  MergedPanel,
  OwnersPanel,
  TvClockBlock,
  TvHeader,
  WorkPanel,
} from './tv-panels'

/**
 * Cada arranjo cabe inteiro no seu quadro de referência (ver LAYOUT_BASE):
 * nada rola. O que não couber é cortado com "e mais N", nunca escondido
 * atrás de uma barra de rolagem que ninguém vai usar numa TV.
 */
export function TvBoard({ layout }: { layout: TvLayout }) {
  const dashboard = useQuery(dashboardQuery)
  const data = dashboard.data
  const error = dashboard.error

  if (layout === 'coluna') {
    // A lista e o gráfico dividem o que sobra; o resto ocupa só o que precisa.
    // Sem nada aberto, a lista vira uma tira e o gráfico fica com o espaço.
    const nothingOpen =
      !!data && data.attention.length === 0 && data.pullRequests.authored.every((pr) => pr.isDraft)
    return (
      <div
        // minmax(0, 1fr): sem isso, um título longo alarga a coluna além da janela.
        className="grid h-full grid-cols-[minmax(0,1fr)] gap-3"
        style={{
          gridTemplateRows: `auto auto ${nothingOpen ? 'auto' : 'minmax(0, 1.2fr)'} minmax(10rem, 1fr) auto`,
        }}
      >
        <TvHeader data={data} compact />
        <KpiTiles data={data} columns={2} dense />
        <motion.div {...fadeUp(0.15)} className="min-h-0">
          <WorkPanel data={data} error={error} max={5} dense />
        </motion.div>
        <motion.div {...fadeUp(0.2)} className="min-h-0">
          <MergedPanel data={data} />
        </motion.div>
        <motion.div {...fadeUp(0.25)} className="max-h-44 min-h-0">
          <AgendaPanel maxItems={3} dense />
        </motion.div>
      </div>
    )
  }

  if (layout === 'faixa') {
    return (
      <div className="grid h-full grid-cols-[11rem_minmax(0,3fr)_minmax(0,2fr)] gap-3">
        <TvClockBlock data={data} />
        <KpiTiles data={data} columns={6} dense tall />
        <motion.div {...fadeUp(0.15)} className="min-h-0">
          <WorkPanel data={data} error={error} max={3} dense />
        </motion.div>
      </div>
    )
  }

  if (layout === 'mini') {
    return (
      <div className="flex h-full flex-col gap-3">
        <TvHeader data={data} compact />
        <KpiTiles data={data} columns={3} dense className="min-h-0 flex-1" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <TvHeader data={data} />
      <KpiTiles data={data} columns={6} className="shrink-0" />
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,3fr)] gap-4">
        <motion.div {...fadeUp(0.15)} className="min-h-0">
          <WorkPanel data={data} error={error} max={7} />
        </motion.div>
        <motion.div
          {...fadeUp(0.2)}
          className="grid min-h-0 grid-rows-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4"
        >
          <MergedPanel data={data} />
          <AgePanel data={data} />
        </motion.div>
        {/* Agenda vazia vira tira (data-calm) e a organização fica com o espaço. */}
        <motion.div {...fadeUp(0.25)} className="flex min-h-0 flex-col gap-4">
          <div className="min-h-0 flex-[1.2] has-[[data-calm]]:flex-none">
            <AgendaPanel dense />
          </div>
          <div className="min-h-0 flex-1">
            <OwnersPanel data={data} />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
