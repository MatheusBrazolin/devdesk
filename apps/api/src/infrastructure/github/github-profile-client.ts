import { z } from 'zod'
import type { GitHubProfiles } from '../../application/ports/github-profiles.js'
import type {
  GitHubTokenInspector,
  TokenInspection,
} from '../../application/ports/github-token-inspector.js'
import type { GitHubProfile } from '../../application/ports/user-repository.js'
import { githubReconnect, githubUnavailable } from '../../domain/errors.js'
import { createReadOnlyFetch } from './read-only-fetch.js'
import { readGitHubJson } from './read-github-json.js'

const profileSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
})

export class GitHubProfileClient implements GitHubProfiles, GitHubTokenInspector {
  constructor(private readonly fetchImpl: typeof fetch = createReadOnlyFetch()) {}

  async fetchProfile(accessToken: string): Promise<GitHubProfile> {
    return (await this.inspect(accessToken)).profile
  }

  async inspect(accessToken: string): Promise<TokenInspection> {
    const response = await this.fetchImpl('https://api.github.com/user', {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${accessToken}`,
        'x-github-api-version': '2022-11-28',
      },
    })
    if (response.status === 401) throw githubReconnect('O GitHub recusou o token.')
    if (!response.ok)
      throw githubUnavailable(`GitHub respondeu ${response.status} ao buscar o perfil.`)

    const profile = await readGitHubJson(response, profileSchema, 'buscar o perfil')
    // Tokens classic dizem os escopos neste cabeçalho; os fine-grained não mandam nada.
    const scopes = response.headers.get('x-oauth-scopes')
    return {
      profile: {
        githubId: profile.id,
        login: profile.login,
        name: profile.name,
        avatarUrl: profile.avatar_url,
      },
      scopes:
        scopes === null
          ? null
          : scopes
              .split(',')
              .map((scope) => scope.trim())
              .filter(Boolean),
    }
  }
}
