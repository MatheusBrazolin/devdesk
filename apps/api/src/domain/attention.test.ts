import { describe, expect, it } from 'vitest'
import { buildAttentionList, reasonForAuthoredPullRequest } from './attention.js'
import type { PullRequest, WorkSnapshot } from './work.js'

let seq = 0
function pr(overrides: Partial<PullRequest> = {}): PullRequest {
  seq += 1
  return {
    id: `PR_${seq}`,
    number: seq,
    title: `PR ${seq}`,
    url: `https://github.com/acme/app/pull/${seq}`,
    repository: 'acme/app',
    author: { login: 'eu', avatarUrl: null },
    isDraft: false,
    createdAt: new Date('2026-10-20T10:00:00Z'),
    updatedAt: new Date('2026-10-22T10:00:00Z'),
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
  }
}

function snapshot(partial: Partial<WorkSnapshot>): WorkSnapshot {
  return {
    fetchedAt: new Date(),
    isSample: false,
    reviewRequested: [],
    authored: [],
    merged: [],
    issues: [],
    totals: { reviewRequested: 0, authored: 0, merged: 0, issues: 0 },
    ...partial,
  }
}

describe('reasonForAuthoredPullRequest', () => {
  it('pedido de mudança vence qualquer outro motivo', () => {
    expect(
      reasonForAuthoredPullRequest(
        pr({ reviewDecision: 'changes_requested', ciStatus: 'failure', mergeable: 'conflicting' }),
      ),
    ).toBe('changes_requested')
  })

  it('CI quebrado vem antes de conflito', () => {
    expect(
      reasonForAuthoredPullRequest(pr({ ciStatus: 'failure', mergeable: 'conflicting' })),
    ).toBe('ci_failed')
  })

  it('aponta conflito', () => {
    expect(reasonForAuthoredPullRequest(pr({ mergeable: 'conflicting' }))).toBe('conflict')
  })

  it('aprovado, mergeável e com CI verde está pronto para merge', () => {
    expect(reasonForAuthoredPullRequest(pr({ reviewDecision: 'approved' }))).toBe('ready_to_merge')
  })

  it('aprovado sem CI configurado também está pronto', () => {
    expect(reasonForAuthoredPullRequest(pr({ reviewDecision: 'approved', ciStatus: null }))).toBe(
      'ready_to_merge',
    )
  })

  it('repositório sem review obrigatória: uma aprovação basta', () => {
    expect(reasonForAuthoredPullRequest(pr({ reviewDecision: null, approvals: 1 }))).toBe(
      'ready_to_merge',
    )
  })

  it('sem review obrigatória: pedido de mudança pesa mais que aprovação', () => {
    expect(
      reasonForAuthoredPullRequest(pr({ reviewDecision: null, approvals: 1, changesRequested: 1 })),
    ).toBe('changes_requested')
  })

  it('sem review obrigatória: só pedido de mudança também pede atenção', () => {
    expect(reasonForAuthoredPullRequest(pr({ reviewDecision: null, changesRequested: 1 }))).toBe(
      'changes_requested',
    )
  })

  it('repositório sem review obrigatória e sem aprovação não está pronto', () => {
    expect(reasonForAuthoredPullRequest(pr({ reviewDecision: null, approvals: 0 }))).toBeNull()
  })

  it('aprovado com CI rodando ainda não está pronto', () => {
    expect(
      reasonForAuthoredPullRequest(pr({ reviewDecision: 'approved', ciStatus: 'pending' })),
    ).toBeNull()
  })

  it('aprovado com mergeabilidade ainda desconhecida não está pronto', () => {
    expect(
      reasonForAuthoredPullRequest(pr({ reviewDecision: 'approved', mergeable: 'unknown' })),
    ).toBeNull()
  })

  it('PR esperando review dos outros não pede atenção', () => {
    expect(reasonForAuthoredPullRequest(pr())).toBeNull()
  })

  it('rascunho nunca pede atenção', () => {
    expect(reasonForAuthoredPullRequest(pr({ isDraft: true, ciStatus: 'failure' }))).toBeNull()
  })
})

describe('buildAttentionList', () => {
  it('ordena por urgência', () => {
    const ready = pr({ reviewDecision: 'approved' })
    const broken = pr({ ciStatus: 'failure' })
    const review = pr()
    const list = buildAttentionList(
      snapshot({ reviewRequested: [review], authored: [ready, broken] }),
    )
    expect(list.map((item) => item.reason)).toEqual([
      'review_requested',
      'ci_failed',
      'ready_to_merge',
    ])
  })

  it('reviews pedidas: quem espera há mais tempo vem primeiro', () => {
    const recente = pr({ updatedAt: new Date('2026-10-22T00:00:00Z') })
    const antiga = pr({ updatedAt: new Date('2026-10-10T00:00:00Z') })
    const list = buildAttentionList(snapshot({ reviewRequested: [recente, antiga] }))
    expect(list.map((item) => item.pullRequest.id)).toEqual([antiga.id, recente.id])
  })

  it('PRs seus: o mais recente vem primeiro', () => {
    const antigo = pr({ ciStatus: 'failure', updatedAt: new Date('2026-10-10T00:00:00Z') })
    const recente = pr({ ciStatus: 'failure', updatedAt: new Date('2026-10-22T00:00:00Z') })
    const list = buildAttentionList(snapshot({ authored: [antigo, recente] }))
    expect(list.map((item) => item.pullRequest.id)).toEqual([recente.id, antigo.id])
  })

  it('ignora rascunhos com review pedida', () => {
    expect(buildAttentionList(snapshot({ reviewRequested: [pr({ isDraft: true })] }))).toEqual([])
  })

  it('não repete um PR que aparece em duas listas', () => {
    const both = pr({ ciStatus: 'failure' })
    const list = buildAttentionList(snapshot({ reviewRequested: [both], authored: [both] }))
    expect(list).toHaveLength(1)
    expect(list[0]?.reason).toBe('review_requested')
  })
})
