import { z } from 'zod'

/** Período do "ontem": instantes, porque o dia útil anterior depende do fuso de quem pede. */
export const standupQuerySchema = z
  .object({ from: z.iso.datetime(), to: z.iso.datetime() })
  .refine(({ from, to }) => Date.parse(from) < Date.parse(to), 'from depois de to')
  .refine(
    ({ from, to }) => Date.parse(to) - Date.parse(from) <= 4 * 86_400_000,
    'período longo demais',
  )

export const standupItemSchema = z.object({
  kind: z.enum([
    // o que foi feito
    'merged',
    'opened',
    'reviewed',
    'closed_issue',
    // o que pede atenção hoje
    'review_requested',
    'changes_requested',
    'ci_failed',
    'conflict',
    'ready_to_merge',
    // bloqueios
    'waiting_review',
  ]),
  title: z.string(),
  url: z.url(),
  repository: z.string(),
  number: z.number().int(),
  /** Complemento curto: "aprovado", "há 16 dias", "pedido por ana". */
  detail: z.string().nullable(),
})

export const standupSchema = z.object({
  done: z.array(standupItemSchema),
  today: z.array(standupItemSchema),
  blockers: z.array(standupItemSchema),
  isSample: z.boolean(),
})

export type StandupItem = z.infer<typeof standupItemSchema>
export type StandupKind = StandupItem['kind']
export type Standup = z.infer<typeof standupSchema>
