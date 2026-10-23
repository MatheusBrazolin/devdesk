import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { TokenCipher } from '../../application/ports/security.js'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12

/** AES-256-GCM. O payload é "iv.tag.cifra", tudo em base64url. */
export class AesTokenCipher implements TokenCipher {
  private readonly key: Buffer

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, 'base64')
    if (this.key.length !== 32) throw new Error('A chave precisa ter 32 bytes.')
  }

  encrypt(plain: string): string {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.')
  }

  decrypt(payload: string): string {
    const [iv, tag, encrypted] = payload.split('.').map((part) => Buffer.from(part, 'base64url'))
    if (!iv || !tag || !encrypted) throw new Error('Payload cifrado malformado.')
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  }
}
