import type { GitHubProfiles } from '../ports/github-profiles.js'
import type { GitHubProfile, UserRepository } from '../ports/user-repository.js'
import type { GitHubTokenProvider } from '../services/github-token-provider.js'
import type { CreateSession, CreatedSession } from './create-session.js'

/**
 * Modo pessoal: a API roda com um token do próprio usuário (PAT), que age
 * como ele. Diferente de um OAuth App, não depende de cada organização
 * liberar o acesso. Só faz sentido numa instalação local, de uma pessoa.
 */
export class StartPersonalSession {
  private cachedProfile: Promise<GitHubProfile> | null = null

  constructor(
    private readonly token: string,
    private readonly profiles: GitHubProfiles,
    private readonly users: UserRepository,
    private readonly tokens: GitHubTokenProvider,
    private readonly createSession: CreateSession,
  ) {}

  /** O dono do token, para a tela de login. Uma falha não fica guardada. */
  profile(): Promise<GitHubProfile> {
    this.cachedProfile ??= this.profiles.fetchProfile(this.token).catch((error: unknown) => {
      this.cachedProfile = null
      throw error
    })
    return this.cachedProfile
  }

  async execute(): Promise<CreatedSession> {
    // Lê o perfil na hora: o token pode ter sido revogado desde o início.
    const profile = await this.profiles.fetchProfile(this.token)
    const user = await this.users.upsertFromGitHub(profile)
    await this.tokens.save(user.id, {
      accessToken: this.token,
      accessTokenExpiresAt: null,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    })
    return this.createSession.execute(user.id)
  }
}
