import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TagInput } from './tag-input'

describe('TagInput', () => {
  afterEach(cleanup)

  it('confirma com Enter', async () => {
    const onChange = vi.fn()
    render(<TagInput value={[]} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Adicionar tag'), 'deploy{Enter}')
    expect(onChange).toHaveBeenCalledWith(['deploy'])
  })

  it('não perde o texto digitado quando o editor sai da tela', async () => {
    const onChange = vi.fn()
    const { unmount } = render(<TagInput value={['infra']} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Adicionar tag'), '#Rascunho')
    unmount()
    expect(onChange).toHaveBeenCalledWith(['infra', 'rascunho'])
  })

  it('sem texto pendente, sair não muda nada', () => {
    const onChange = vi.fn()
    const { unmount } = render(<TagInput value={['infra']} onChange={onChange} />)
    unmount()
    expect(onChange).not.toHaveBeenCalled()
  })
})
