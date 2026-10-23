export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface Session {
  /** Hash do token do cookie; o token em si nunca é persistido. */
  id: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

export function isSessionExpired(session: Session, now: Date): boolean {
  return session.expiresAt.getTime() <= now.getTime()
}
