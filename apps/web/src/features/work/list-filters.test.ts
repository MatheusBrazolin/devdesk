import { describe, expect, it } from 'vitest'
import { applyFilter, applySort, isStale, ownerCounts } from './list-filters'

const now = new Date('2026-10-23T12:00:00Z')
const item = (repository: string, number: number, title: string, updatedAt: string) => ({
  repository,
  number,
  title,
  updatedAt,
})

const items = [
  item('umbrella/workers', 136, 'fix(cache): fonte parada', '2026-10-22T14:00:00Z'),
  item('globex/quotes-api', 765, 'fix(quotes): fechamento do DAX', '2026-10-22T10:00:00Z'),
  item('umbrella/workers', 98, 'fix(jobs): versões fixas', '2026-10-07T10:00:00Z'),
]

describe('applyFilter', () => {
  it('ignora acento e acha palavra por palavra, em qualquer ordem', () => {
    const list = [
      {
        title: 'Migra a tabela para paginação',
        repository: 'acme/web-app',
        number: 1290,
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        title: 'Outra coisa',
        repository: 'acme/api',
        number: 7,
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ]
    expect(applyFilter(list, { q: 'paginacao' }).map((i) => i.number)).toEqual([1290])
    expect(applyFilter(list, { q: 'tabela migra' }).map((i) => i.number)).toEqual([1290])
    expect(applyFilter(list, { q: 'web-app#1290' }).map((i) => i.number)).toEqual([1290])
    expect(applyFilter(list, { q: '#7' }).map((i) => i.number)).toEqual([7])
  })

  it('busca no título sem diferenciar maiúsculas', () => {
    expect(applyFilter(items, { q: 'DAX' }).map((i) => i.number)).toEqual([765])
  })

  it('busca pelo repositório', () => {
    expect(applyFilter(items, { q: 'workers' })).toHaveLength(2)
  })

  it('busca pelo número, com ou sem #', () => {
    expect(applyFilter(items, { q: '#98' }).map((i) => i.number)).toEqual([98])
    expect(applyFilter(items, { q: '136' }).map((i) => i.number)).toEqual([136])
  })

  it('filtra pela organização', () => {
    expect(applyFilter(items, { org: 'globex' }).map((i) => i.number)).toEqual([765])
  })

  it('combina busca e organização', () => {
    expect(applyFilter(items, { org: 'umbrella', q: 'jobs' })).toHaveLength(1)
  })

  it('sem filtro devolve tudo', () => {
    expect(applyFilter(items, {})).toHaveLength(3)
  })
})

describe('applySort', () => {
  it('recentes primeiro', () => {
    expect(applySort(items, 'recentes').map((i) => i.number)).toEqual([136, 765, 98])
  })

  it('mais antigos primeiro', () => {
    expect(applySort(items, 'antigos').map((i) => i.number)).toEqual([98, 765, 136])
  })

  it('por repositório e, dentro dele, recentes primeiro', () => {
    expect(applySort(items, 'repositorio').map((i) => i.number)).toEqual([765, 136, 98])
  })

  it('não altera a lista original', () => {
    const copy = [...items]
    applySort(items, 'antigos')
    expect(items).toEqual(copy)
  })
})

describe('isStale', () => {
  it('mais de 7 dias sem atividade está parado', () => {
    expect(isStale(items[2]!, now)).toBe(true)
  })

  it('atualizado ontem não está', () => {
    expect(isStale(items[0]!, now)).toBe(false)
  })
})

describe('ownerCounts', () => {
  it('conta por organização, da mais frequente para a menos', () => {
    expect(ownerCounts(items)).toEqual([
      { owner: 'umbrella', count: 2 },
      { owner: 'globex', count: 1 },
    ])
  })
})
