import { z } from 'zod'
import type { GitHubProfiles } from '../../application/ports/github-profiles.js'
import type { GitHubProfile } from '../../application/ports/user-repository.js'
import { githubReconnect, upstream } from '../../domain/errors.js'
import { createReadOnlyFetch } from './read-only-fetch.js'

const profileSchema = z.object({
  id: z.number(),
  login: z.string(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
})

export class GitHubProfileClient implements GitHubProfiles {
  constructor(private readonly fetchImpl: typeof fetch = createReadOnlyFetch()) {}

  async fetchProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await this.fetchImpl('https://api.github.com/user', {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${accessToken}`,
        'x-github-api-version': '2022-11-28',
      },
    })
    if (response.status === 401) throw githubReconnect('O GitHub recusou o token.')
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
