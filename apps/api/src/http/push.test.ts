import { describe, expect, it } from 'vitest'
import { CRON_SECRET, cookieHeader, createTestApp } from '../../test/helpers.js'
import type { PullRequest } from '../domain/work.js'

const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/navegador-1'
const subscription = { endpoint: ENDPOINT, keys: { p256dh: 'chave', auth: 'segredo' } }

function failingPr(): PullRequest {
  return {
    id: 'PR_9',
    number: 9,
    title: 'Cache do catálogo',
    url: 'https://github.com/acme/web/pull/9',
    repository: 'acme/web',
    author: { login: 'octocat', avatarUrl: null },
    isDraft: false,
    createdAt: new Date('2026-10-23T10:00:00Z'),
    updatedAt: new Date('2026-10-23T11:00:00Z'),
    mergedAt: null,
    ciStatus: 'failure',
    reviewDecision: 'review_required',
    mergeable: 'mergeable',
    approvals: 0,
    changesRequested: 0,
    size: null,
    reviewRequestedAt: null,
    pendingReviewers: [],
    comments: 0,
    milestone: null,
  }
}

async function signedIn() {
  const ctx = await createTestApp({ personalToken: 'ghp_valido' })
  const login = await ctx.app.inject({
    method: 'POST',
    url: '/api/auth/personal',
    headers: { 'content-type': 'application/json' },
    payload: {},
  })
  return { ...ctx, headers: { cookie: cookieHeader(login.headers['set-cookie']) } }
}

const run = (app: Awaited<ReturnType<typeof signedIn>>['app'], secret = CRON_SECRET) =>
  app.inject({
    method: 'POST',
    url: '/api/push/run',
    headers: { authorization: `Bearer ${secret}` },
  })

describe('avisos com o app fechado', () => {
  it('entrega a chave pública só para quem tem sessão', async () => {
    const { app, headers } = await signedIn()
    expect((await app.inject({ url: '/api/push' })).statusCode).toBe(401)
    expect((await app.inject({ url: '/api/push', headers })).json()).toEqual({
      publicKey: 'chave-publica-de-teste',
    })
  })

  it('recusa serviço de push desconhecido e o modo demonstração', async () => {
    const { app, headers } = await signedIn()
    const evil = await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers,
      payload: { ...subscription, endpoint: 'https://169.254.169.254/latest' },
    })
    expect(evil.statusCode).toBe(400)

    const demo = await app.inject({ method: 'POST', url: '/api/auth/demo' })
    const res = await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers: { cookie: cookieHeader(demo.headers['set-cookie']) },
      payload: subscription,
    })
    expect(res.statusCode).toBe(403)
  })

  it('a rodada exige o segredo do agendador', async () => {
    const { app } = await signedIn()
    expect((await run(app, 'errado')).statusCode).toBe(401)
    expect((await app.inject({ method: 'POST', url: '/api/push/run' })).statusCode).toBe(401)
  })

  it('anota na primeira rodada e avisa só o que aparece depois', async () => {
    const { app, headers, githubWork, pushSender } = await signedIn()
    const sub = await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers,
      payload: subscription,
    })
    expect(sub.statusCode).toBe(204)

    expect((await run(app)).json()).toEqual({ users: 1, sent: 0 })

    githubWork.result = { authored: [failingPr()] }
    expect((await run(app)).json()).toEqual({ users: 1, sent: 1 })
    expect(pushSender.sent[0]!.notice).toMatchObject({
      title: 'CI falhou: acme/web#9',
      tag: 'ci_failed:PR_9',
    })

    // Nada novo: nada enviado.
    expect((await run(app)).json()).toEqual({ users: 1, sent: 0 })
  })

  it('esquece o navegador que o serviço de push deu por encerrado', async () => {
    const { app, headers, githubWork, pushSender, pushRepository } = await signedIn()
    await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers,
      payload: subscription,
    })
    await run(app)
    pushSender.gone.add(ENDPOINT)
    githubWork.result = { authored: [failingPr()] }
    await run(app)
    expect(pushRepository.subscriptions.size).toBe(0)
  })

  it('desligar remove a inscrição', async () => {
    const { app, headers, pushRepository } = await signedIn()
    await app.inject({
      method: 'POST',
      url: '/api/push/subscriptions',
      headers,
      payload: subscription,
    })
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/push/subscriptions',
      headers,
      payload: { endpoint: ENDPOINT },
    })
    expect(res.statusCode).toBe(204)
    expect(pushRepository.subscriptions.size).toBe(0)
  })
})
