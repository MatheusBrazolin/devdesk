import { describe, expect, it } from 'vitest'
import { entryScript } from './update-check'

describe('entryScript', () => {
  it('acha o script principal do build no index.html', () => {
    const html = `<head>
      <script src="/theme-init.js"></script>
      <script type="module" crossorigin src="/assets/index-DZ8l5y0j.js"></script>
      <link rel="stylesheet" crossorigin href="/assets/index-DPtHBVoM.css">
    </head>`
    expect(entryScript(html)).toBe('/assets/index-DZ8l5y0j.js')
  })

  it('ignora scripts que não são do build', () => {
    expect(entryScript('<script src="/theme-init.js"></script>')).toBeNull()
  })

  it('o index do desenvolvimento (sem build) não conta como versão', () => {
    expect(entryScript('<script type="module" src="/src/main.tsx"></script>')).toBeNull()
  })
})
