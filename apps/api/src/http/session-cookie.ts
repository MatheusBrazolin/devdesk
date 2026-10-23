import type { FastifyReply, FastifyRequest } from 'fastify'

export const SESSION_COOKIE = 'devdesk_session'
export const OAUTH_STATE_COOKIE = 'devdesk_oauth_state'

export interface CookieSettings {
  secure: boolean
}

export function setSessionCookie(
  reply: FastifyReply,
  settings: CookieSettings,
  session: { token: string; expiresAt: Date },
): void {
  reply.setCookie(SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: settings.secure,
    path: '/',
    expires: session.expiresAt,
  })
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' })
}

export const readSessionToken = (request: FastifyRequest): string | undefined =>
  request.cookies[SESSION_COOKIE]
