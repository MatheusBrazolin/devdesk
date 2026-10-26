import type { CalendarSubscription } from '../../domain/external-calendar.js'

export interface NewSubscription {
  userId: string
  name: string
  host: string
  /** O endereço da agenda é segredo: só entra cifrado. */
  urlEncrypted: string
  createdAt: Date
}

export interface SubscriptionWithUrl {
  subscription: CalendarSubscription
  urlEncrypted: string
}

export interface SubscriptionRepository {
  list(userId: string): Promise<CalendarSubscription[]>
  listWithUrls(userId: string): Promise<SubscriptionWithUrl[]>
  create(subscription: NewSubscription): Promise<CalendarSubscription>
  delete(userId: string, id: string): Promise<boolean>
}
