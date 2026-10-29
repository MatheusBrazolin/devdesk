import { describe, expect, it } from 'vitest'
import { pageTitle } from './use-document-title'

describe('pageTitle', () => {
  it('põe o nome da página e as reviews pedidas na frente', () => {
    expect(pageTitle('/pull-requests')).toBe('Pull requests · DevDesk')
    expect(pageTitle('/', 3)).toBe('(3) Hoje · DevDesk')
    expect(pageTitle('/nao-existe')).toBe('DevDesk')
  })
})
