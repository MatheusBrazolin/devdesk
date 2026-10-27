import type { StandupItem } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { formatWeek, weekCounts } from './format'

const item = (kind: StandupItem['kind'], number: number, detail: string | null = null) => ({
  kind,
  title: `Item ${number}`,
  url: `https://github.com/acme/web/pull/${number}`,
  repository: 'acme/web',
  number,
  detail,
})

const done = [item('merged', 1), item('reviewed', 2, 'aprovado'), item('closed_issue', 3)]

describe('formatWeek', () => {
  it('conta e agrupa o que foi feito', () => {
    expect(weekCounts(done)).toEqual({ merged: 1, opened: 0, reviewed: 1, closedIssues: 1 })
    const text = formatWeek({ label: '20 a 26 de out.', done, blockers: [] }, 'markdown')
    expect(text).toContain('**Semana de 20 a 26 de out.**')
    expect(text).toContain('1 PR mergeado · 1 review feita · 0 PRs abertos · 1 issue fechada')
    expect(text).toContain(
      '**Entregue**\n- [acme/web#1](https://github.com/acme/web/pull/1): Item 1\n- [acme/web#3]',
    )
    expect(text).toContain(
      '**Revisado**\n- [acme/web#2](https://github.com/acme/web/pull/2): Item 2 (aprovado)',
    )
    expect(text).not.toContain('**Aberto**')
    expect(text).toContain('- Nada travado.')
  })

  it('usa o link de cada formato e lista o que está travado', () => {
    const text = formatWeek(
      { label: 'x', done: [], blockers: [item('waiting_review', 9, 'há 9 dias')] },
      'slack',
    )
    expect(text).toContain(
      '<https://github.com/acme/web/pull/9|acme/web#9>: Item 9 (esperando review há 9 dias)',
    )
  })
})
