import { describe, expect, it } from 'vitest'
import { excerpt } from './excerpt'

describe('excerpt', () => {
  it('tira a marcação do markdown', () => {
    expect(excerpt('## Título\n- **item** com `código` e [link](https://x.y)')).toBe(
      'Título item com código e link',
    )
  })

  it('mantém hífens dentro das palavras', () => {
    expect(excerpt('- revisar a pré-venda\n1. code-review')).toBe('revisar a pré-venda code-review')
  })

  it('tira as caixas de tarefa', () => {
    expect(excerpt('- [x] feito\n- [ ] falta')).toBe('feito falta')
  })

  it('ignora blocos de código', () => {
    expect(excerpt('antes\n```ts\nconst a = 1\n```\ndepois')).toBe('antes depois')
  })

  it('corta textos longos com reticências', () => {
    expect(excerpt('palavra '.repeat(40), 20)).toBe('palavra palavra pala…')
  })
})
