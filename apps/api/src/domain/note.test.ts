import { describe, expect, it } from 'vitest'
import { dedupeLinks, normalizeTags, resolveTitle, UNTITLED } from './note.js'

describe('normalizeTags', () => {
  it('trata Bug, #bug e " bug " como a mesma tag', () => {
    expect(normalizeTags(['Bug', '#bug', ' bug '])).toEqual(['bug'])
  })

  it('separa tags juntas por vírgula', () => {
    expect(normalizeTags(['Deploy,#infra', 'review'])).toEqual(['deploy', 'infra', 'review'])
  })

  it('troca espaços internos por hífen', () => {
    expect(normalizeTags(['code review'])).toEqual(['code-review'])
  })

  it('descarta vazias e longas demais', () => {
    expect(normalizeTags(['', '#', 'x'.repeat(31), 'ok'])).toEqual(['ok'])
  })

  it('guarda no máximo 10', () => {
    expect(normalizeTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(10)
  })
})

describe('resolveTitle', () => {
  it('usa o título informado', () => {
    expect(resolveTitle('  Reunião  ', 'corpo')).toBe('Reunião')
  })

  it('sem título, usa a primeira linha do corpo sem o #', () => {
    expect(resolveTitle('', '\n\n## Ideias para o sprint\n- a')).toBe('Ideias para o sprint')
  })

  it('nota vazia fica "Sem título"', () => {
    expect(resolveTitle(' ', '  \n ')).toBe(UNTITLED)
  })
})

describe('dedupeLinks', () => {
  it('mantém um vínculo por URL', () => {
    const link = {
      kind: 'issue' as const,
      repository: 'a/b',
      number: 1,
      url: 'https://github.com/a/b/issues/1',
      title: 'x',
    }
    expect(dedupeLinks([link, { ...link, title: 'outro título' }])).toEqual([link])
  })
})
