import { z } from 'zod'
import type { GitHubOAuth } from '../../application/ports/github-oauth.js'
import type { GitHubProfile } from '../../application/ports/user-repository.js'
import { upstream } from '../../domain/errors.js'

/** Escopos mínimos para ler PRs, reviews e issues, inclusive de repositórios privados. */
export const GITHUB_SCOPES = ['read:user', 'read:org', 'repo'] as const

const tokenResponseSchema = z.union([
  z.object({ access_token: z.string() }),
  z.object({ error: z.string(), error_description: z.string().optional() }),
])

const profileSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
})

interface Options {
  clientId: string
  clientSecret: string
  redirectUri: string
  fetch?: typeof fetch
}

export class GitHubOAuthClient implements GitHubOAuth {
  private readonly fetch: typeof fetch

  constructor(private readonly options: Options) {
    this.fetch = options.fetch ?? globalThis.fetch
  }

  authorizeUrl(state: string): string {
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', this.options.clientId)
    url.searchParams.set('redirect_uri', this.options.redirectUri)
    url.searchParams.set('scope', GITHUB_SCOPES.join(' '))
    url.searchParams.set('state', state)
    url.searchParams.set('allow_signup', 'false')
    return url.toString()
  }

  async exchangeCode(code: string): Promise<string> {
    const response = await this.fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        code,
        redirect_uri: this.options.redirectUri,
      }),
    })
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao trocar o code.`)

    const body = tokenResponseSchema.parse(await response.json())
    if ('error' in body) {
      throw upstream(`GitHub recusou o login: ${body.error_description ?? body.error}`)
    }
    return body.access_token
  }

  async fetchProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await this.fetch('https://api.github.com/user', {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${accessToken}`,
        'x-github-api-version': '2022-11-28',
      },
    })
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao buscar o perfil.`)

    const profile = profileSchema.parse(await response.json())
    return {
      githubId: profile.id,
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
    }
  }
}
