import { describe, expect, it } from 'vitest'
import { userSchema } from './user.js'

describe('userSchema', () => {
  const valid = {
    id: '0b7e5a4c-3f0e-4d43-9a57-2f0f6f5d7c11',
    login: 'octocat',
    name: null,
    avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
    isDemo: false,
  }

  it('aceita um usuário válido', () => {
    expect(userSchema.parse(valid)).toEqual(valid)
  })

  it('descarta campos que não fazem parte do contrato', () => {
    const parsed = userSchema.parse({ ...valid, accessToken: 'segredo' })
    expect(parsed).not.toHaveProperty('accessToken')
  })

  it('rejeita login vazio', () => {
    expect(() => userSchema.parse({ ...valid, login: '' })).toThrow()
  })
})
