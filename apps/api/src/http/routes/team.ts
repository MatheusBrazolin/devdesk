import type { Team } from '@devdesk/shared'
import type { FastifyInstance } from 'fastify'
import type { AppDependencies } from '../dependencies.js'
import { readSessionToken } from '../session-cookie.js'

export async function teamRoutes(app: FastifyInstance, deps: AppDependencies): Promise<void> {
  const { getCurrentUser, getTeam } = deps.useCases

  app.get('/team', async (request): Promise<Team> => {
    const user = await getCurrentUser.execute(readSessionToken(request))
    const team = await getTeam.execute(user)
    return {
      isSample: team.isSample,
      fetchedAt: team.fetchedAt.toISOString(),
      repositories: team.repositories,
      totals: team.totals,
      queue: team.queue.map((pr) => ({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        url: pr.url,
        repository: pr.repository,
        author: pr.author,
        createdAt: pr.createdAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
        reviews: pr.reviews,
        pendingReviewers: pr.pendingReviewers,
        lines: pr.lines,
        waitingHours: pr.waitingHours,
      })),
      reviewLoad: team.reviewLoad,
    }
  })
}
