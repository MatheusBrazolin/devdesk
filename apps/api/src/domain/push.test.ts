import { describe, expect, it } from 'vitest'
import type { AttentionItem } from './attention.js'
import { isAllowedPushEndpoint, isValidTimeZone, pushLocale, pushRound } from './push.js'
import type { PullRequest } from './work.js'

const now = new Date('2026-10-26T15:00:00Z')
const ORIGIN = 'https://devdesk.test'

let seq = 0
function item(
  reason: AttentionItem['reason'],
  overrides: Partial<PullRequest> = {},
): AttentionItem {
  seq += 1
  return {
    reason,
    pullRequest: {
      id: `PR_${seq}`,
      number: seq,
      title: `PR ${seq}`,
      url: `https://github.com/acme/app/pull/${seq}`,
      repository: 'acme/app',
      author: { login: 'ana', avatarUrl: null },
      isDraft: false,
      createdAt: new Date(now.getTime() - 2 * 3_600_000),
      updatedAt: now,
      mergedAt: null,
      ciStatus: 'success',
      reviewDecision: 'review_required',
      mergeable: 'mergeable',
      approvals: 0,
      changesRequested: 0,
      size: null,
      reviewRequestedAt: null,
      pendingReviewers: [],
      comments: 0,
      milestone: null,
      ...overrides,
    },
  }
}

describe('pushRound', () => {
  it('na primeira rodada só anota, sem avisar', () => {
    const round = pushRound(null, [item('ci_failed')], [], now, ORIGIN)
    expect(round.notices).toEqual([])
    expect(round.keys).toHaveLength(1)
  })

  it('avisa só o que é novo, com as mesmas etiquetas do app aberto', () => {
    const old = item('review_requested')
    const fresh = item('ci_failed')
    const first = pushRound(null, [old], [], now, ORIGIN)
    const round = pushRound(new Set(first.keys), [old, fresh], [], now, ORIGIN)
    expect(round.notices).toEqual([
      {
        title: `CI falhou: acme/app#${fresh.pullRequest.number}`,
        body: fresh.pullRequest.title,
        url: fresh.pullRequest.url,
        tag: `ci_failed:${fresh.pullRequest.id}`,
      },
    ])
  })

  it('muitos de uma vez viram um aviso só', () => {
    const items = [item('ci_failed'), item('conflict'), item('ready_to_merge'), item('ci_failed')]
    const round = pushRound(new Set(), items, [], now, ORIGIN)
    expect(round.notices).toHaveLength(1)
    expect(round.notices[0]).toMatchObject({
      title: '4 itens novos pedem sua atenção',
      tag: 'atencao',
    })
  })

  it('review parada há mais de 24 h avisa uma vez', () => {
    const late = item('review_requested', {
      reviewRequestedAt: new Date(now.getTime() - 30 * 3_600_000),
    })
    const seen = new Set([`review_requested:${late.pullRequest.id}`])
    const round = pushRound(seen, [late], [], now, ORIGIN)
    expect(round.notices.map((n) => n.tag)).toEqual([`atrasada:${late.pullRequest.id}`])
    expect(pushRound(new Set(round.keys), [late], [], now, ORIGIN).notices).toEqual([])
  })

  it('avisa a reunião que começa nos próximos 15 minutos', () => {
    const events = [
      {
        id: 'a',
        title: 'Daily',
        startsAt: new Date(now.getTime() + 10 * 60_000),
        calendar: 'Trabalho',
      },
      {
        id: 'b',
        title: 'Mais tarde',
        startsAt: new Date(now.getTime() + 60 * 60_000),
        calendar: null,
      },
    ]
    const round = pushRound(new Set(), [], events, now, ORIGIN)
    expect(round.notices).toEqual([
      expect.objectContaining({ title: 'Às 12:10: Daily', body: 'Na agenda Trabalho' }),
    ])
  })
})

describe('pushRound no idioma e no fuso de quem recebe', () => {
  const daily = {
    id: 'a',
    title: 'Daily',
    startsAt: new Date(now.getTime() + 10 * 60_000),
    calendar: 'Trabalho',
  }
  const en = { language: 'en', timeZone: 'Europe/Lisbon' } as const

  it('a agenda sai em inglês, com a hora do fuso da pessoa', () => {
    const round = pushRound(new Set(), [], [daily], now, ORIGIN, undefined, en)
    expect(round.notices).toEqual([
      expect.objectContaining({ title: 'At 3:10 PM: Daily', body: 'In the Trabalho calendar' }),
    ])
  })

  it('o português também segue o fuso', () => {
    const tokyo = { language: 'pt-BR', timeZone: 'Asia/Tokyo' } as const
    const round = pushRound(new Set(), [], [daily], now, ORIGIN, undefined, tokyo)
    expect(round.notices[0]!.title).toBe('Às 00:10: Daily')
  })

  it('PRs e o resumo saem em inglês, com as mesmas chaves', () => {
    const fresh = item('ci_failed')
    const late = item('review_requested', {
      reviewRequestedAt: new Date(now.getTime() - 30 * 3_600_000),
    })
    const seen = new Set([`review_requested:${late.pullRequest.id}`])
    const pt = pushRound(seen, [fresh, late], [], now, ORIGIN)
    const round = pushRound(seen, [fresh, late], [], now, ORIGIN, undefined, en)
    expect(round.keys).toEqual(pt.keys)
    expect(round.notices.map((n) => n.title)).toEqual([
      `Review waiting for over 24 h: acme/app#${late.pullRequest.number}`,
      `CI failed: acme/app#${fresh.pullRequest.number}`,
    ])

    const many = [item('ci_failed'), item('conflict'), item('ready_to_merge'), item('ci_failed')]
    const summary = pushRound(new Set(), many, [], now, ORIGIN, undefined, en).notices[0]!
    expect(summary.title).toBe('4 new items need your attention')
    expect(summary.body).toMatch(/^CI failed: .* · Conflict: .* · Ready to merge: /)
  })

  it('sem idioma ou com fuso desconhecido, vale português e Brasília', () => {
    expect(pushLocale({})).toEqual({ language: 'pt-BR', timeZone: 'America/Sao_Paulo' })
    expect(pushLocale({ language: 'en', timeZone: 'Marte/Olympus' })).toEqual({
      language: 'en',
      timeZone: 'America/Sao_Paulo',
    })
    expect(isValidTimeZone('America/New_York')).toBe(true)
    expect(isValidTimeZone('Marte/Olympus')).toBe(false)
  })
})

describe('pushRound com tipos desligados', () => {
  it('não avisa o tipo desligado, mas anota para não avisar depois', () => {
    const ci = item('ci_failed')
    const review = item('review_requested')
    const round = pushRound(new Set(), [ci, review], [], now, ORIGIN, new Set(['review_requested']))
    expect(round.notices.map((n) => n.tag)).toEqual([`review_requested:${review.pullRequest.id}`])
    expect(round.keys).toContain(`ci_failed:${ci.pullRequest.id}`)
  })
})

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QAbc',
    'https://wns2-bl2p.notify.windows.com/w/?token=abc',
  ])('aceita %s', (endpoint) => expect(isAllowedPushEndpoint(endpoint)).toBe(true))

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.com/x',
    'https://169.254.169.254/latest',
    'https://fcm.googleapis.com:8443/x',
    'não é url',
  ])('recusa %s', (endpoint) => expect(isAllowedPushEndpoint(endpoint)).toBe(false))
})
