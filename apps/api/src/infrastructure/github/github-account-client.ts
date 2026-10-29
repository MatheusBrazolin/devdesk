import { z } from 'zod'
import type {
  GitHubAccount,
  GitHubAccountSnapshot,
} from '../../application/ports/github-account.js'
import { githubReconnect, githubUnavailable } from '../../domain/errors.js'
import { readGitHubJson } from './read-github-json.js'
import { createReadOnlyFetch } from './read-only-fetch.js'
import { parseTokenExpiration } from './token-expiration.js'

const orgsSchema = z.array(z.object({ login: z.string(), avatar_url: z.string().nullable() }))
const rateSchema = z.object({
  resources: z.object({
    core: z.object({ remaining: z.number(), limit: z.number(), reset: z.number() }),
  }),
})

/** Saúde do token: três leituras baratas (a de cota nem conta na cota). */
export class GitHubAccountClient implements GitHubAccount {
  constructor(private readonly fetchImpl: typeof fetch = createReadOnlyFetch()) {}

  async snapshot(accessToken: string): Promise<GitHubAccountSnapshot> {
    const get = (path: string) =>
      this.fetchImpl(`https://api.github.com${path}`, {
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${accessToken}`,
          'x-github-api-version': '2022-11-28',
        },
      })
    const [user, orgs, rate] = await Promise.all([
      get('/user'),
      get('/user/orgs?per_page=100'),
      get('/rate_limit'),
    ])
    if (user.status === 401) throw githubReconnect('O GitHub recusou o token.')
    if (!user.ok) throw githubUnavailable(`GitHub respondeu ${user.status} ao conferir o token.`)

    const organizations = orgs.ok
      ? (await readGitHubJson(orgs, orgsSchema, 'listar as organizações')).map((org) => ({
          login: org.login,
          avatarUrl: org.avatar_url,
        }))
      : []
    const core = rate.ok
      ? (await readGitHubJson(rate, rateSchema, 'ler a cota')).resources.core
      : null

    return {
      expiresAt: parseTokenExpiration(user.headers.get('github-authentication-token-expiration')),
      organizations,
      rateLimit: core && {
        remaining: core.remaining,
        limit: core.limit,
        resetAt: new Date(core.reset * 1000),
      },
    }
  }
}
