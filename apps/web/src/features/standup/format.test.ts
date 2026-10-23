import type { CalendarEvent, StandupItem } from '@devdesk/shared'
import { describe, expect, it } from 'vitest'
import { formatStandup } from './format'

const item = (
  kind: StandupItem['kind'],
  number: number,
  detail: string | null = null,
): StandupItem => ({
  kind,
  title: `Título ${number}`,
  url: `https://github.com/acme/app/pull/${number}`,
  repository: 'acme/app',
  number,
  detail,
})

const event = (title: string, startsAt: Date): CalendarEvent => ({
  id: '0b7e5a4c-3f0e-4d43-9a57-2f0f6f5d7c11',
  title,
  description: '',
  kind: 'event',
  link: null,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  allDay: false,
  startsAt: startsAt.toISOString(),
  endsAt: null,
})

const input = {
  sinceLabel: 'qui., 22 out.',
  done: [item('merged', 1), item('reviewed', 2, 'aprovado')],
  today: [item('review_requested', 3, 'de ana'), item('ready_to_merge', 4)],
  blockers: [item('waiting_review', 5, 'há 16 dias')],
  events: [event('Planning', new Date(2026, 9, 23, 10, 0))],
}

describe('formatStandup', () => {
  it('markdown, com links e negrito', () => {
    expect(formatStandup(input, 'markdown')).toBe(
      [
        '**Ontem (qui., 22 out.)**',
        '- Mergeei [acme/app#1](https://github.com/acme/app/pull/1): Título 1',
        '- Revisei [acme/app#2](https://github.com/acme/app/pull/2): Título 2 (aprovado)',
        '',
        '**Hoje**',
        '- 10:00 Planning',
        '- Revisar [acme/app#3](https://github.com/acme/app/pull/3): Título 3 (de ana)',
        '- Fazer merge de [acme/app#4](https://github.com/acme/app/pull/4): Título 4 (aprovado)',
        '',
        '**Bloqueios**',
        '- [acme/app#5](https://github.com/acme/app/pull/5) esperando review há 16 dias',
      ].join('\n'),
    )
  })

  it('Slack usa *negrito* e <url|texto>', () => {
    const text = formatStandup(input, 'slack')
    expect(text).toContain('*Hoje*')
    expect(text).toContain('<https://github.com/acme/app/pull/1|acme/app#1>')
    expect(text).not.toContain('**')
  })

  it('texto simples não tem marcação nem URL', () => {
    const text = formatStandup(input, 'texto')
    expect(text).toContain('- Mergeei acme/app#1: Título 1')
    expect(text).not.toMatch(/https?:|\*|\[/)
  })

  it('seções vazias dizem que estão vazias', () => {
    const text = formatStandup({ ...input, done: [], today: [], blockers: [], events: [] }, 'texto')
    expect(text).toContain('- Nada registrado no GitHub.')
    expect(text).toContain('- Sem pendências no GitHub nem eventos na agenda.')
    expect(text).toContain('- Nenhum.')
  })
})
