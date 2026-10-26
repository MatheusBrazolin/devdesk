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
import { SampleMetricsSource } from './infrastructure/sample/sample-metrics-source.js'
import { GitHubMetricsSource } from './infrastructure/github/github-metrics-source.js'
import { GetMetrics } from './application/use-cases/get-metrics.js'
import { GetTeam } from './application/use-cases/get-team.js'
import { PushNotifications } from './application/use-cases/push-notifications.js'
import { WebPushSender } from './infrastructure/push/web-push-sender.js'
import { DrizzlePushRepository } from './infrastructure/repositories/drizzle-push-repository.js'
import { GitHubTeamSource } from './infrastructure/github/github-team-source.js'
import { SampleTeamSource } from './infrastructure/sample/sample-team-source.js'
import { ExternalCalendars } from './application/use-cases/external-calendars.js'
import { expandIcs } from './infrastructure/ics/expand-ics.js'
import { HttpIcsFetcher } from './infrastructure/ics/http-ics-fetcher.js'
import { DrizzleSubscriptionRepository } from './infrastructure/repositories/drizzle-subscription-repository.js'
import { SAMPLE_CALENDAR, SAMPLE_ICS } from './infrastructure/sample/sample-external-calendar.js'

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

  const calendar = new Calendar(new DrizzleEventRepository(db), getDashboard, systemClock)
  const externalCalendars = new ExternalCalendars(
    new DrizzleSubscriptionRepository(db),
    cipher,
    new HttpIcsFetcher(),
    expandIcs,
    { ...SAMPLE_CALENDAR, ics: SAMPLE_ICS },
    systemClock,
  )
  const push =
    env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
      ? {
          notifications: new PushNotifications(
            new DrizzlePushRepository(db),
            new WebPushSender(
              env.VAPID_PUBLIC_KEY,
              env.VAPID_PRIVATE_KEY,
              env.VAPID_SUBJECT ??
                (env.WEB_ORIGIN.startsWith('https://')
                  ? env.WEB_ORIGIN
                  : 'https://github.com/MatheusBrazolin/devdesk'),
            ),
            users,
            getDashboard,
            calendar,
            externalCalendars,
            env.WEB_ORIGIN,
            systemClock,
          ),
          cronSecret: env.PUSH_CRON_SECRET ?? null,
        }
      : null

  return {
    push,
    config: {
      webOrigin: env.WEB_ORIGIN,
      secureCookies: env.NODE_ENV === 'production',
      demoEnabled: env.DEMO_ENABLED,
    },
    github: oauth && {
      oauth,
      completeLogin: new CompleteGitHubLogin(
        oauth,
        users,
        githubTokens,
        createSession,
        // Com o token pessoal configurado, o dono dele entra pelo OAuth e vê
        // as organizações; vale também em produção, onde o login direto não existe.
        env.GITHUB_PERSONAL_TOKEN
          ? { token: env.GITHUB_PERSONAL_TOKEN, profiles: new GitHubProfileClient() }
          : null,
      ),
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
      startDemoSession: new StartDemoSession(env.DEMO_ENABLED, users, createSession, systemClock),
      getCurrentUser: new GetCurrentUser(sessions, users, tokens, systemClock),
      logout: new Logout(sessions, tokens),
      getDashboard,
      notes: new Notes(new DrizzleNoteRepository(db), systemClock),
      calendar,
      externalCalendars,
      getMetrics: new GetMetrics(
        { github: new GitHubMetricsSource(), sample: new SampleMetricsSource(systemClock) },
        githubTokens,
        systemClock,
      ),
      getTeam: new GetTeam(
        getDashboard,
        { github: new GitHubTeamSource(), sample: new SampleTeamSource(systemClock) },
        githubTokens,
        systemClock,
      ),
      getStandup: new GetStandup(
        getDashboard,
        { github: new GitHubActivitySource(), sample: new SampleActivitySource() },
        githubTokens,
        systemClock,
      ),
    },
  }
}
