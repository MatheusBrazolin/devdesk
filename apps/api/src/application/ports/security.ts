export interface TokenCipher {
  encrypt(plain: string): string
  decrypt(payload: string): string
}

export interface SessionTokens {
  /** Gera o token que vai no cookie. */
  generate(): string
  /** Deriva o id persistido a partir do token. */
  hash(token: string): string
}

export interface Clock {
  now(): Date
}
