import { describe, expect, it } from 'vitest'
import { GitHubProfileClient } from './github-profile-client.js'

const PROFILE = { id: 42, login: 'colega', name: 'Colega', avatar_url: null }

const fakeFetch =
  (status: number, headers: Record<string, string> = {}): typeof fetch =>
  async () =>
    new Response(JSON.stringify(PROFILE), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    })

describe('GitHubProfileClient', () => {
  it('lê o perfil e os escopos de um token classic', async () => {
    const client = new GitHubProfileClient(
      fakeFetch(200, { 'x-oauth-scopes': 'repo, read:org, read:user' }),
    )
    expect(await client.inspect('ghp_x')).toEqual({
      profile: { githubId: 42, login: 'colega', name: 'Colega', avatarUrl: null },
      scopes: ['repo', 'read:org', 'read:user'],
    })
  })

  it('fine-grained não manda escopos: fica nulo', async () => {
    const client = new GitHubProfileClient(fakeFetch(200))
    expect((await client.inspect('github_pat_x')).scopes).toBeNull()
  })

  it('token recusado vira GITHUB_RECONNECT', async () => {
    const client = new GitHubProfileClient(fakeFetch(401))
    await expect(client.inspect('ghp_x')).rejects.toMatchObject({ code: 'GITHUB_RECONNECT' })
  })
})
