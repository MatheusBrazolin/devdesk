import { z } from 'zod'

/** Os tipos de aviso que a pessoa pode ligar e desligar. */
export const NOTICE_KINDS = [
  'review_requested',
  'changes_requested',
  'ci_failed',
  'conflict',
  'ready_to_merge',
  'overdue_review',
  'agenda',
] as const

export const noticeKindSchema = z.enum(NOTICE_KINDS)

/** "dono/repositorio", como o GitHub escreve. */
export const repositoryNameSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'use o formato dono/repositorio')
  .max(140)

export const MAX_TEAM_REPOSITORIES = 10

const on = z.boolean().default(true)

/** Configurações da pessoa. Campos novos ganham padrão: dado antigo continua válido. */
export const settingsSchema = z.object({
  notifications: z
    .object({
      review_requested: on,
      changes_requested: on,
      ci_failed: on,
      conflict: on,
      ready_to_merge: on,
      overdue_review: on,
      agenda: on,
    })
    .default({
      review_requested: true,
      changes_requested: true,
      ci_failed: true,
      conflict: true,
      ready_to_merge: true,
      overdue_review: true,
      agenda: true,
    }),
  /** Repositórios do painel do time. Nulo: escolhidos sozinhos, pelos seus PRs e reviews. */
  teamRepositories: z
    .array(repositoryNameSchema)
    .max(MAX_TEAM_REPOSITORIES, `até ${MAX_TEAM_REPOSITORIES} repositórios`)
    .nullable()
    .default(null),
})

export const settingsResponseSchema = z.object({ settings: settingsSchema })

export type NoticeKind = z.infer<typeof noticeKindSchema>
export type Settings = z.infer<typeof settingsSchema>
export type SettingsInput = z.input<typeof settingsSchema>
