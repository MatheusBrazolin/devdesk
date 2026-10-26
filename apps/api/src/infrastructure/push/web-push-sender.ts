import webpush from 'web-push'
import type { PushResult, PushSender } from '../../application/ports/push.js'
import type { PushNotice, PushSubscription } from '../../domain/push.js'

/** Envia pelo protocolo Web Push, assinado com as chaves VAPID do servidor. */
export class WebPushSender implements PushSender {
  constructor(
    readonly publicKey: string,
    private readonly privateKey: string,
    private readonly subject: string,
  ) {}

  async send(subscription: PushSubscription, notice: PushNotice): Promise<PushResult> {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(notice), {
        vapidDetails: {
          subject: this.subject,
          publicKey: this.publicKey,
          privateKey: this.privateKey,
        },
        // Aviso velho não serve: se o aparelho ficar uma hora fora, o serviço descarta.
        TTL: 3600,
        timeout: 10_000,
      })
      return 'sent'
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      return status === 404 || status === 410 ? 'gone' : 'failed'
    }
  }
}
