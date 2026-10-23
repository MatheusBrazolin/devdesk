import type { AttentionItem } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { attentionKey, attentionNotice, newAttention } from './attention-notices'

const item = (id: string, reason: AttentionItem['reason']) =>
  ({
    reason,
    pullRequest: {
      id,
      number: 42,
      title: 'Corrige o login',
      url: `https://github.com/a/b/pull/${id}`,
      repository: 'a/b',
    },
  }) as AttentionItem

describe('avisos de atenção', () => {
  it('só o que é novo vira aviso', () => {
    const seen = new Set([attentionKey(item('1', 'review_requested'))])
    const fresh = newAttention(seen, [item('1', 'review_requested'), item('2', 'ci_failed')])
    expect(fresh.map((i) => i.pullRequest.id)).toEqual(['2'])
  })

  it('o mesmo PR com outro motivo avisa de novo', () => {
    const seen = new Set([attentionKey(item('1', 'review_requested'))])
    expect(newAttention(seen, [item('1', 'changes_requested')])).toHaveLength(1)
  })

  it('o aviso diz o motivo, o PR e leva até ele', () => {
    expect(attentionNotice(item('7', 'ci_failed'))).toEqual({
      title: 'CI falhou: a/b#42',
      body: 'Corrige o login',
      url: 'https://github.com/a/b/pull/7',
      tag: 'ci_failed:7',
    })
  })
})
