import { connectGitHubTokenInputSchema, type GitHubTokenStatus } from '@devdesk/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { PersonalTokenStatus } from '../../application/use-cases/personal-github-token.js'
import type { AppDependencies } from '../dependencies.js'
import { readSessionToken } from '../session-cookie.js'

const present = (status: PersonalTokenStatus): GitHubTokenStatus => ({
  connected: status.connected,
  savedAt: status.savedAt?.toISOString() ?? null,
})

/** Token pessoal do GitHub. O token nunca volta para o navegador: só se ele existe. */
export async function githubTokenRoutes(
  app: FastifyInstance,
  deps: AppDependencies,
): Promise<void> {
  const { getCurrentUser, personalGitHubToken } = deps.useCases
  const currentUser = (request: FastifyRequest) => getCurrentUser.execute(readSessionToken(request))

  app.get('/github/token', async (request) =>
    present(await personalGitHubToken.status(await currentUser(request))),
  )

  app.put('/github/token', async (request) => {
    const user = await currentUser(request)
    const { token } = connectGitHubTokenInputSchema.parse(request.body)
    return present(await personalGitHubToken.connect(user, token))
  })

  app.delete('/github/token', async (request) =>
    present(await personalGitHubToken.disconnect(await currentUser(request))),
  )
}
