import type { PushNotice, PushSubscription } from '../../domain/push.js'

export interface PushRepository {
  save(userId: string, subscription: PushSubscription): Promise<void>
  delete(userId: string, endpoint: string): Promise<void>
  /** Inscrição que o serviço de push deu por encerrada (o navegador desinstalou, por exemplo). */
  deleteEndpoint(endpoint: string): Promise<void>
  listForUser(userId: string): Promise<PushSubscription[]>
  usersWithSubscriptions(): Promise<string[]>
  /** Nulo: ainda não houve rodada para essa pessoa. */
  seen(userId: string): Promise<Set<string> | null>
  saveSeen(userId: string, keys: string[], now: Date): Promise<void>
}

export type PushResult = 'sent' | 'gone' | 'failed'

export interface PushSender {
  readonly publicKey: string
  send(subscription: PushSubscription, notice: PushNotice): Promise<PushResult>
}
