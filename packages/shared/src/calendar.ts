import { z } from 'zod'
import { noteLinkSchema } from './notes.js'

export const EVENT_LIMITS = { title: 200, description: 5_000 } as const

/** Data de calendário, sem fuso: "2026-10-24". */
export const calendarDateSchema = z.iso.date()

/**
 * Quando um evento acontece. Dia inteiro é uma data (não muda com o fuso);
 * com horário é um instante em UTC. Misturar os dois é o bug clássico de
 * calendário: o evento "do dia 24" que aparece no dia 23.
 */
export const eventTimingSchema = z.discriminatedUnion('allDay', [
  z.object({
    allDay: z.literal(true),
    date: calendarDateSchema,
    /** Último dia, inclusive. Ausente: um dia só. */
    endDate: calendarDateSchema.nullable().default(null),
  }),
  z.object({
    allDay: z.literal(false),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable().default(null),
  }),
])

export const eventKindSchema = z.enum(['event', 'reminder'])

const eventFields = {
  title: z.string().trim().min(1, 'dê um título').max(EVENT_LIMITS.title),
  description: z.string().max(EVENT_LIMITS.description).default(''),
  kind: eventKindSchema.default('event'),
  link: noteLinkSchema.nullable().default(null),
}

export const createEventInputSchema = z.object(eventFields).and(eventTimingSchema)

export const calendarEventSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    description: z.string(),
    kind: eventKindSchema,
    link: noteLinkSchema.nullable(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  })
  .and(eventTimingSchema)

/** Prazo de uma milestone do GitHub, só para leitura. */
export const deadlineSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: calendarDateSchema,
  url: z.url(),
  repository: z.string(),
  /** Quantos dos seus PRs e issues abertos estão nessa milestone. */
  items: z.number().int(),
})

export const calendarRangeQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .refine(({ from, to }) => from <= to, 'from depois de to')
  .refine(({ from, to }) => daysBetween(from, to) <= 400, 'intervalo grande demais')

/** Eventos vêm do banco do DevDesk e respondem na hora. */
export const calendarResponseSchema = z.object({ events: z.array(calendarEventSchema) })

/**
 * Prazos vêm do GitHub e podem demorar ou falhar; por isso têm rota própria,
 * para não segurar os eventos.
 */
export const deadlinesResponseSchema = z.object({
  deadlines: z.array(deadlineSchema),
  /** Falso quando o GitHub não respondeu. */
  available: z.boolean(),
})

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

export type CalendarDate = z.infer<typeof calendarDateSchema>
export type EventTiming = z.infer<typeof eventTimingSchema>
export type EventKind = z.infer<typeof eventKindSchema>
export type CreateEventInput = z.input<typeof createEventInputSchema>
export type CalendarEvent = z.infer<typeof calendarEventSchema>
export type Deadline = z.infer<typeof deadlineSchema>
export type CalendarResponse = z.infer<typeof calendarResponseSchema>
export type DeadlinesResponse = z.infer<typeof deadlinesResponseSchema>
