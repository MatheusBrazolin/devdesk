import { describe, expect, it } from 'vitest'
import { TEST_KEY } from '../../../test/helpers.js'
import { AesTokenCipher } from './aes-token-cipher.js'

describe('AesTokenCipher', () => {
  const cipher = new AesTokenCipher(TEST_KEY)

  it('cifra e decifra', () => {
    expect(cipher.decrypt(cipher.encrypt('gho_abc'))).toBe('gho_abc')
  })

  it('gera um payload diferente a cada vez (IV aleatório)', () => {
    expect(cipher.encrypt('gho_abc')).not.toBe(cipher.encrypt('gho_abc'))
  })

  it('detecta adulteração', () => {
    const [iv, tag, data] = cipher.encrypt('gho_abc').split('.')
    const tampered = [iv, tag, Buffer.from('outra-coisa').toString('base64url')].join('.')
    expect(data).toBeDefined()
    expect(() => cipher.decrypt(tampered)).toThrow()
  })

  it('recusa chave de tamanho errado', () => {
    expect(() => new AesTokenCipher(Buffer.alloc(16).toString('base64'))).toThrow()
  })
})
