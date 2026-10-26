import { z } from 'zod'
import { eventTimingSchema } from './calendar.js'

export const SUBSCRIPTION_LIMITS = { name: 60, url: 2_000 } as const

export const createSubscriptionInputSchema = z.object({
  name: z.string().trim().min(1, 'dê um nome').max(SUBSCRIPTION_LIMITS.name),
  url: z.string().trim().min(1, 'cole o endereço da agenda').max(SUBSCRIPTION_LIMITS.url),
})

/** Uma agenda assinada. O endereço nunca volta para o navegador: é segredo. */
export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** "Google Agenda", "Outlook" ou "iCloud". */
  provider: z.string(),
  createdAt: z.iso.datetime(),
})

export const subscriptionsResponseSchema = z.object({
  subscriptions: z.array(subscriptionSchema),
  /** Falso no modo demonstração, que já vem com uma agenda de exemplo. */
  canEdit: z.boolean(),
})

/** Ocorrência de um evento de agenda externa: só leitura, repetições já expandidas. */
export const externalEventSchema = z
  .object({
    id: z.string(),
    calendarId: z.string(),
    calendar: z.string(),
    title: z.string(),
    location: z.string().nullable(),
  })
  .and(eventTimingSchema)

export const externalEventsResponseSchema = z.object({
  events: z.array(externalEventSchema),
  /** As agendas que não responderam agora; os eventos delas faltam. */
  unavailable: z.array(z.string()),
})

export type CreateSubscriptionInput = z.input<typeof createSubscriptionInputSchema>
export type Subscription = z.infer<typeof subscriptionSchema>
export type SubscriptionsResponse = z.infer<typeof subscriptionsResponseSchema>
export type ExternalEvent = z.infer<typeof externalEventSchema>
export type ExternalEventsResponse = z.infer<typeof externalEventsResponseSchema>
