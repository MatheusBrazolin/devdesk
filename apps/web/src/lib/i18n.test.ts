import { describe, expect, it } from 'vitest'
import { englishDictionary, plural, t } from './i18n'

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('i18n', () => {
  it('nos testes vale o português, e {nome} é trocado pelo valor', () => {
    expect(t('Salvar')).toBe('Salvar')
    expect(t('Olá, {nome}', { nome: 'Ana' })).toBe('Olá, Ana')
    expect(plural(1, '{n} item', '{n} itens')).toBe('1 item')
    expect(plural(3, '{n} item', '{n} itens')).toBe('3 itens')
  })

  it('cada tradução tem os mesmos {marcadores} do português e nenhuma está vazia', () => {
    const entries = Object.entries(englishDictionary())
    expect(entries.length).toBeGreaterThan(0)
    for (const [pt, en] of entries) {
      expect(en.trim(), pt).not.toBe('')
      expect(placeholders(en), pt).toEqual(placeholders(pt))
    }
  })
})

describe('dicionários', () => {
  it('a mesma frase em português tem a mesma tradução em todas as pastas', () => {
    const modules = import.meta.glob<{ default: Record<string, string> }>('/src/**/en.ts', {
      eager: true,
    })
    const seen = new Map<string, { en: string; file: string }>()
    const conflicts: string[] = []
    for (const [file, module] of Object.entries(modules)) {
      for (const [pt, en] of Object.entries(module.default)) {
        const before = seen.get(pt)
        if (before && before.en !== en)
          conflicts.push(`"${pt}": "${before.en}" (${before.file}) x "${en}" (${file})`)
        seen.set(pt, { en, file })
      }
    }
    expect(conflicts).toEqual([])
  })
})
