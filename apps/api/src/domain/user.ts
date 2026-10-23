export interface User {
  id: string
  /** Nulo apenas para o usuário de demonstração. */
  githubId: number | null
  login: string
  name: string | null
  avatarUrl: string | null
  isDemo: boolean
  createdAt: Date
  updatedAt: Date
}
