import { z } from 'zod'
import type { GitHubOAuth } from '../../application/ports/github-oauth.js'
import type { Clock } from '../../application/ports/security.js'
import type { GitHubProfile } from '../../application/ports/user-repository.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import type { GitHubTokens } from '../../domain/github-tokens.js'
import { GitHubProfileClient } from './github-profile-client.js'
import { createReadOnlyFetch } from './read-only-fetch.js'
import { readGitHubJson } from './read-github-json.js'

/** Escopos mínimos para ler PRs, reviews e issues, inclusive de repositórios privados. */
export const GITHUB_SCOPES = ['read:user', 'read:org', 'repo'] as const

const tokenResponseSchema = z.union([
  z.object({
    access_token: z.string(),
    /** Só vêm quando o app usa tokens que expiram. Em segundos. */
    expires_in: z.number().optional(),
    refresh_token: z.string().optional(),
    refresh_token_expires_in: z.number().optional(),
  }),
  z.object({ error: z.string(), error_description: z.string().optional() }),
])

interface Options {
  clientId: string
  clientSecret: string
  redirectUri: string
  clock: Clock
  fetch?: typeof fetch
}

export class GitHubOAuthClient implements GitHubOAuth {
  private readonly fetch: typeof fetch

  constructor(private readonly options: Options) {
    this.fetch = options.fetch ?? createReadOnlyFetch()
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

  async exchangeCode(code: string): Promise<GitHubTokens> {
    const body = await this.requestToken({ code, redirect_uri: this.options.redirectUri })
    if ('error' in body) {
      throw upstream(`GitHub recusou o login: ${body.error_description ?? body.error}`)
    }
    return this.toTokens(body)
  }

  async refreshTokens(refreshToken: string): Promise<GitHubTokens> {
    const body = await this.requestToken({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
    if ('error' in body) {
      // bad_refresh_token: revogado, expirado ou já usado.
      if (body.error === 'bad_refresh_token') throw githubReconnect()
      throw upstream(`GitHub recusou a renovação: ${body.error_description ?? body.error}`)
    }
    return this.toTokens(body)
  }

  private async requestToken(params: Record<string, string>) {
    const response = await this.fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        ...params,
      }),
    })
    if (!response.ok) throw upstream(`GitHub respondeu ${response.status} ao emitir o token.`)
    return readGitHubJson(response, tokenResponseSchema, 'emitir o token')
  }

  private toTokens(body: {
    access_token: string
    expires_in?: number
    refresh_token?: string
    refresh_token_expires_in?: number
  }): GitHubTokens {
    const now = this.options.clock.now().getTime()
    const at = (seconds: number | undefined) =>
      seconds === undefined ? null : new Date(now + seconds * 1000)
    return {
      accessToken: body.access_token,
      accessTokenExpiresAt: at(body.expires_in),
      refreshToken: body.refresh_token ?? null,
      refreshTokenExpiresAt: at(body.refresh_token_expires_in),
    }
  }

  fetchProfile(accessToken: string): Promise<GitHubProfile> {
    return new GitHubProfileClient(this.fetch).fetchProfile(accessToken)
  }
}
