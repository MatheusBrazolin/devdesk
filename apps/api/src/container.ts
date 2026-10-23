import { GitHubTokenProvider } from './application/services/github-token-provider.js'
import { CompleteGitHubLogin } from './application/use-cases/complete-github-login.js'
import { CreateSession } from './application/use-cases/create-session.js'
import { GetDashboard } from './application/use-cases/get-dashboard.js'
import { GetCurrentUser } from './application/use-cases/get-current-user.js'
import { Calendar } from './application/use-cases/calendar.js'
import { GetStandup } from './application/use-cases/get-standup.js'
import { Notes } from './application/use-cases/notes.js'
import { Logout } from './application/use-cases/logout.js'
import { StartPersonalSession } from './application/use-cases/start-personal-session.js'
import { StartDemoSession } from './application/use-cases/start-demo-session.js'
import type { Env } from './config/env.js'
import type { AppDependencies } from './http/dependencies.js'
import { AesTokenCipher } from './infrastructure/crypto/aes-token-cipher.js'
import { RandomSessionTokens, systemClock } from './infrastructure/crypto/session-tokens.js'
import type { Database } from './infrastructure/db/client.js'
import { InMemorySnapshotCache } from './infrastructure/cache/in-memory-snapshot-cache.js'
import {
  LayeredSnapshotCache,
  PostgresSnapshotCache,
} from './infrastructure/cache/postgres-snapshot-cache.js'
import { GitHubProfileClient } from './infrastructure/github/github-profile-client.js'
import { GitHubActivitySource } from './infrastructure/github/github-activity-source.js'
import { GitHubOAuthClient } from './infrastructure/github/github-oauth-client.js'
import { GitHubWorkSource } from './infrastructure/github/github-work-source.js'
import { DrizzleEventRepository } from './infrastructure/repositories/drizzle-event-repository.js'
import { DrizzleNoteRepository } from './infrastructure/repositories/drizzle-note-repository.js'
import { DrizzleSessionRepository } from './infrastructure/repositories/drizzle-session-repository.js'
import { DrizzleUserRepository } from './infrastructure/repositories/drizzle-user-repository.js'
import { SampleActivitySource } from './infrastructure/sample/sample-activity-source.js'
import { SampleWorkSource } from './infrastructure/sample/sample-work-source.js'

/** Raiz de composição: o único lugar que conhece as implementações concretas. */
export function createContainer(env: Env, db: Database): AppDependencies {
  const users = new DrizzleUserRepository(db)
  const sessions = new DrizzleSessionRepository(db)
  const tokens = new RandomSessionTokens()
  const cipher = new AesTokenCipher(env.TOKEN_ENCRYPTION_KEY)

  const createSession = new CreateSession(sessions, tokens, systemClock)

  const oauth =
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? new GitHubOAuthClient({
          clientId: env.GITHUB_CLIENT_ID,
          clientSecret: env.GITHUB_CLIENT_SECRET,
          redirectUri: `${env.API_PUBLIC_URL}/auth/github/callback`,
          clock: systemClock,
        })
      : null
  const githubTokens = new GitHubTokenProvider(users, oauth, cipher, systemClock)
  // Painel e calendário usam a mesma instância: o calendário aproveita o cache do painel.
  const getDashboard = new GetDashboard(
    { github: new GitHubWorkSource(systemClock), sample: new SampleWorkSource(systemClock) },
    githubTokens,
    new LayeredSnapshotCache(new InMemorySnapshotCache(), new PostgresSnapshotCache(db)),
    systemClock,
  )

  return {
    config: {
      webOrigin: env.WEB_ORIGIN,
      secureCookies: env.NODE_ENV === 'production',
      demoEnabled: env.DEMO_ENABLED,
    },
    github: oauth && {
      oauth,
      completeLogin: new CompleteGitHubLogin(oauth, users, githubTokens, createSession),
    },
    personal:
      env.personalTokenEnabled && env.GITHUB_PERSONAL_TOKEN
        ? new StartPersonalSession(
            env.GITHUB_PERSONAL_TOKEN,
            new GitHubProfileClient(),
            users,
            githubTokens,
            createSession,
          )
        : null,
    useCases: {
      startDemoSession: new StartDemoSession(env.DEMO_ENABLED, users, createSession),
      getCurrentUser: new GetCurrentUser(sessions, users, tokens, systemClock),
      logout: new Logout(sessions, tokens),
      getDashboard,
      notes: new Notes(new DrizzleNoteRepository(db), systemClock),
      calendar: new Calendar(new DrizzleEventRepository(db), getDashboard, systemClock),
      getStandup: new GetStandup(
        getDashboard,
        { github: new GitHubActivitySource(), sample: new SampleActivitySource() },
        githubTokens,
        systemClock,
      ),
    },
  }
}
