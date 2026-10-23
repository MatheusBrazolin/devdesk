import type { User as UserDto } from '@devdesk/shared'
import type { User } from '../domain/user.js'

/** Única saída de usuário para fora da API: escolhe campo a campo. */
export const presentUser = (user: User): UserDto => ({
  id: user.id,
  login: user.login,
  name: user.name,
  avatarUrl: user.avatarUrl,
  isDemo: user.isDemo,
})
