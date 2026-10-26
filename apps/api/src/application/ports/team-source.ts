import type { TeamPullRequest } from '../../domain/team.js'

/** Os PRs abertos de um conjunto de repositórios. */
export interface TeamSource {
  fetchOpenPullRequests(
    accessToken: string,
    login: string,
    repositories: string[],
  ): Promise<{ pullRequests: TeamPullRequest[]; repositories: string[] }>
}
