import { describe, expect, it } from 'vitest'
import { createNoteInputSchema, noteLinkSchema, updateNoteInputSchema } from './notes.js'

const link = {
  kind: 'pull_request',
  repository: 'umbrella/workers',
  number: 136,
  url: 'https://github.com/umbrella/workers/pull/136',
  title: 'fix(cache): fonte parada',
}

describe('noteLinkSchema', () => {
  it('aceita um PR do GitHub', () => {
    expect(noteLinkSchema.parse(link)).toEqual(link)
  })

  it('recusa link fora do GitHub', () => {
    expect(() => noteLinkSchema.parse({ ...link, url: 'https://exemplo.com/pull/1' })).toThrow()
  })

  it('recusa repositório fora do formato dono/nome', () => {
    expect(() => noteLinkSchema.parse({ ...link, repository: 'workers' })).toThrow()
  })
})

describe('createNoteInputSchema', () => {
  it('preenche os padrões de uma nota vazia', () => {
    expect(createNoteInputSchema.parse({})).toEqual({
      title: '',
      body: '',
      tags: [],
      pinned: false,
      links: [],
    })
  })

  it('limita a quantidade de tags', () => {
    const tags = Array.from({ length: 11 }, (_, i) => `t${i}`)
    expect(() => createNoteInputSchema.parse({ tags })).toThrow()
  })
})

describe('updateNoteInputSchema', () => {
  it('aceita atualização parcial', () => {
    expect(updateNoteInputSchema.parse({ pinned: true })).toEqual({ pinned: true })
  })

  it('recusa atualização vazia', () => {
    expect(() => updateNoteInputSchema.parse({})).toThrow()
  })
})
