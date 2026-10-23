import { createHash, randomBytes } from 'node:crypto'
import type { Clock, SessionTokens } from '../../application/ports/security.js'

export class RandomSessionTokens implements SessionTokens {
  generate(): string {
    return randomBytes(32).toString('base64url')
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}

export const systemClock: Clock = { now: () => new Date() }
