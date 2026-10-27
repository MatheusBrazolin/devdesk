import type { ActivitySource } from '../src/application/ports/activity-source.js'
import type { GitHubOAuth } from '../src/application/ports/github-oauth.js'
import type { GitHubProfiles } from '../src/application/ports/github-profiles.js'
import type {
  GitHubTokenInspector,
  TokenInspection,
} from '../src/application/ports/github-token-inspector.js'
import type { GitHubProfile } from '../src/application/ports/user-repository.js'
import type { Clock } from '../src/application/ports/security.js'
import { CompleteGitHubLogin } from '../src/application/use-cases/complete-github-login.js'
import { CreateSession } from '../src/application/use-cases/create-session.js'
import type { WorkSource } from '../src/application/ports/work-source.js'
import { GitHubTokenProvider } from '../src/application/services/github-token-provider.js'
import { GetDashboard } from '../src/application/use-cases/get-dashboard.js'
import { GetCurrentUser } from '../src/application/use-cases/get-current-user.js'
import { Calendar } from '../src/application/use-cases/calendar.js'
import { GetStandup } from '../src/application/use-cases/get-standup.js'
import { Notes } from '../src/application/use-cases/notes.js'
import { Logout } from '../src/application/use-cases/logout.js'
import { PersonalGitHubToken } from '../src/application/use-cases/personal-github-token.js'
import { StartPersonalSession } from '../src/application/use-cases/start-personal-session.js'
import { GetMetrics } from '../src/application/use-cases/get-metrics.js'
import { GetTeam } from '../src/application/use-cases/get-team.js'
import { Account } from '../src/application/use-cases/account.js'
import { UserSettings } from '../src/application/use-cases/user-settings.js'
import { PushNotifications } from '../src/application/use-cases/push-notifications.js'
import type { PushResult, PushSender } from '../src/application/ports/push.js'
import type { PushNotice, PushSubscription } from '../src/domain/push.js'
import { SampleTeamSource } from '../src/infrastructure/sample/sample-team-source.js'
import { ExternalCalendars } from '../src/application/use-cases/external-calendars.js'
import type { IcsFetcher } from '../src/application/ports/ics-fetcher.js'
import { expandIcs } from '../src/infrastructure/ics/expand-ics.js'
import {
  SAMPLE_CALENDAR,
  SAMPLE_ICS,
} from '../src/infrastructure/sample/sample-external-calendar.js'
import { SampleMetricsSource } from '../src/infrastructure/sample/sample-metrics-source.js'
import { StartDemoSession } from '../src/application/use-cases/start-demo-session.js'
import { buildApp } from '../src/http/app.js'
import type { AppDependencies } from '../src/http/dependencies.js'
import type { Activity } from '../src/domain/activity.js'
import { githubReconnect } from '../src/domain/errors.js'
import type { GitHubTokens } from '../src/domain/github-tokens.js'
import type { WorkSnapshot } from '../src/domain/work.js'
import { InMemorySnapshotCache } from '../src/infrastructure/cache/in-memory-snapshot-cache.js'
import { AesTokenCipher } from '../src/infrastructure/crypto/aes-token-cipher.js'
import { RandomSessionTokens } from '../src/infrastructure/crypto/session-tokens.js'
import {
  InMemoryEventRepository,
  InMemoryNoteRepository,
  InMemoryPushRepository,
  InMemorySettingsRepository,
  InMemorySessionRepository,
  InMemorySubscriptionRepository,
  InMemoryUserRepository,
} from '../src/infrastructure/repositories/in-memory.js'
import { SampleActivitySource } from '../src/infrastructure/sample/sample-activity-source.js'
import { SampleWorkSource } from '../src/infrastructure/sample/sample-work-source.js'

export const TEST_KEY = Buffer.alloc(32, 7).toString('base64')

export class FakeClock implements Clock {
  constructor(public current = new Date('2026-10-23T12:00:00Z')) {}
  now() {
    return this.current
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms)
  }
}

/** GitHub falso: emite tokens com validade configurável e registra as renovações. */
export class FakeGitHubOAuth implements GitHubOAuth {
  readonly refreshCalls: string[] = []
  refreshError: Error | null = null
  private issued = 0

  constructor(
    private readonly clock: FakeClock,
    /** Nulo: tokens que não expiram (app sem "Expire user access tokens"). */
    private readonly expiresInMs: number | null = null,
  ) {}

  authorizeUrl(state: string) {
    return `https://github.com/login/oauth/authorize?state=${state}`
  }

  async exchangeCode(code: string): Promise<GitHubTokens> {
    if (code !== 'bom') throw new Error('code recusado')
    return this.issue()
  }

  async refreshTokens(refreshToken: string): Promise<GitHubTokens> {
    this.refreshCalls.push(refreshToken)
    await new Promise((resolve) => setTimeout(resolve, 5))
    if (this.refreshError) throw this.refreshError
    return this.issue()
  }

  async fetchProfile(): Promise<GitHubProfile> {
    return {
      githubId: 583231,
      login: 'octocat',
      name: 'The Octocat',
      avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
    }
  }

  private issue(): GitHubTokens {
    this.issued += 1
    const now = this.clock.now().getTime()
    const expiring = this.expiresInMs !== null
    return {
      accessToken: this.issued === 1 ? 'gho_token_de_teste' : `ghu_renovado_${this.issued}`,
      accessTokenExpiresAt: expiring ? new Date(now + this.expiresInMs!) : null,
      refreshToken: expiring ? `ghr_${this.issued}` : null,
      refreshTokenExpiresAt: expiring ? new Date(now + 180 * 24 * 60 * 60 * 1000) : null,
    }
  }
}

/** Perfis falsos: só o token 'ghp_valido' é aceito. */
export class FakeGitHubProfiles implements GitHubProfiles, GitHubTokenInspector {
  calls = 0
  /** Escopos que o token "tem"; nulo imita um token fine-grained. */
  scopes: string[] | null = ['repo', 'read:org', 'read:user']

  async inspect(accessToken: string): Promise<TokenInspection> {
    return { profile: await this.fetchProfile(accessToken), scopes: this.scopes }
  }

  async fetchProfile(accessToken: string): Promise<GitHubProfile> {
    this.calls += 1
    // Token de outra pessoa: perfil diferente do que entra pelo OAuth falso.
    if (accessToken === 'ghp_outra_pessoa')
      return { githubId: 999, login: 'outra', name: null, avatarUrl: null }
    if (accessToken !== 'ghp_valido') throw githubReconnect('O GitHub recusou o token.')
    return { githubId: 583231, login: 'octocat', name: 'The Octocat', avatarUrl: null }
  }
}

/** Atividade falsa do GitHub: registra os períodos pedidos. */
export class FakeActivitySource implements ActivitySource {
  readonly calls: { login: string; from: Date; to: Date }[] = []
  result: Activity = { merged: [], opened: [], reviewed: [], closedIssues: [] }

  async fetchActivity(_token: string, login: string, from: Date, to: Date): Promise<Activity> {
    this.calls.push({ login, from, to })
    return this.result
  }
}

/** Fonte do GitHub falsa: registra com qual token foi chamada. */
export class FakeWorkSource implements WorkSource {
  readonly calls: string[] = []
  error: Error | null = null
  /** Atraso artificial, para testar buscas simultâneas. */
  delayMs = 0
  /** O que o GitHub falso devolve, além do vazio padrão. */
  result: Partial<WorkSnapshot> = {}

  constructor(private readonly clock: FakeClock) {}

  async fetchSnapshot(accessToken: string): Promise<WorkSnapshot> {
    this.calls.push(accessToken)
    if (this.delayMs) await new Promise((resolve) => setTimeout(resolve, this.delayMs))
    if (this.error) throw this.error
    return {
      fetchedAt: this.clock.now(),
      isSample: false,
      reviewRequested: [],
      authored: [],
      merged: [],
      issues: [],
      totals: { reviewRequested: 0, authored: 0, merged: 0, issues: 0 },
      ...this.result,
    }
  }
}

/** Provedor de agenda falso: responde o texto cadastrado para cada endereço. */
export class FakeIcsFetcher implements IcsFetcher {
  readonly feeds = new Map<string, string>()
  readonly calls: string[] = []

  async fetch(url: URL): Promise<string> {
    this.calls.push(url.href)
    const text = this.feeds.get(url.href)
    if (text === undefined) throw new Error('agenda fora do ar')
    return text
  }
}

/** Serviço de push falso: guarda o que seria enviado; endpoints em `gone` respondem 410. */
export class FakePushSender implements PushSender {
  readonly publicKey = 'chave-publica-de-teste'
  readonly sent: { endpoint: string; notice: PushNotice }[] = []
  readonly gone = new Set<string>()

  async send(subscription: PushSubscription, notice: PushNotice): Promise<PushResult> {
    if (this.gone.has(subscription.endpoint)) return 'gone'
    this.sent.push({ endpoint: subscription.endpoint, notice })
    return 'sent'
  }
}

export const CRON_SECRET = 'segredo-do-agendador-com-mais-de-32-caracteres'

export function createTestContext(
  options: {
    demoEnabled?: boolean
    github?: boolean
    tokenExpiresInMs?: number
    personalToken?: string
    /** Token pessoal do dono, usado quando ele entra pelo OAuth. */
    ownerToken?: string
  } = {},
) {
  const users = new InMemoryUserRepository()
  const sessions = new InMemorySessionRepository()
  const tokens = new RandomSessionTokens()
  const cipher = new AesTokenCipher(TEST_KEY)
  const clock = new FakeClock()
  const createSession = new CreateSession(sessions, tokens, clock)
  const githubWork = new FakeWorkSource(clock)
  const oauth = new FakeGitHubOAuth(clock, options.tokenExpiresInMs ?? null)
  const githubTokens = new GitHubTokenProvider(users, oauth, cipher, clock)
  const profiles = new FakeGitHubProfiles()
  const notes = new InMemoryNoteRepository()
  const events = new InMemoryEventRepository()
  const snapshotCache = new InMemorySnapshotCache()
  const activity = new FakeActivitySource()
  const subscriptions = new InMemorySubscriptionRepository()
  const icsFetcher = new FakeIcsFetcher()
  const pushRepository = new InMemoryPushRepository()
  const pushSender = new FakePushSender()
  const getDashboard = new GetDashboard(
    { github: githubWork, sample: new SampleWorkSource(clock) },
    githubTokens,
    snapshotCache,
    clock,
  )

  const settingsRepository = new InMemorySettingsRepository()
  const settings = new UserSettings(settingsRepository, clock)
  const calendar = new Calendar(events, getDashboard, clock)
  const externalCalendars = new ExternalCalendars(
    subscriptions,
    cipher,
    icsFetcher,
    expandIcs,
    { ...SAMPLE_CALENDAR, ics: SAMPLE_ICS },
    clock,
  )

  const getMetrics = new GetMetrics(
    { github: new SampleMetricsSource(clock), sample: new SampleMetricsSource(clock) },
    githubTokens,
    clock,
  )
  const getTeam = new GetTeam(
    getDashboard,
    { github: new SampleTeamSource(clock), sample: new SampleTeamSource(clock) },
    githubTokens,
    settings,
    clock,
  )
  const getStandup = new GetStandup(
    getDashboard,
    { github: activity, sample: new SampleActivitySource() },
    githubTokens,
    clock,
  )

  const deps: AppDependencies = {
    push: {
      notifications: new PushNotifications(
        pushRepository,
        pushSender,
        users,
        getDashboard,
        calendar,
        externalCalendars,
        settings,
        'http://web.test',
        clock,
      ),
      cronSecret: CRON_SECRET,
    },
    config: {
      webOrigin: 'http://web.test',
      secureCookies: false,
      demoEnabled: options.demoEnabled ?? true,
    },
    github:
      options.github === false
        ? null
        : {
            oauth,
            completeLogin: new CompleteGitHubLogin(
              oauth,
              users,
              githubTokens,
              createSession,
              options.ownerToken ? { token: options.ownerToken, profiles } : null,
            ),
          },
    personal: options.personalToken
      ? new StartPersonalSession(
          options.personalToken,
          profiles,
          users,
          githubTokens,
          createSession,
        )
      : null,
    useCases: {
      startDemoSession: new StartDemoSession(
        options.demoEnabled ?? true,
        users,
        createSession,
        clock,
      ),
      getCurrentUser: new GetCurrentUser(sessions, users, tokens, clock),
      logout: new Logout(sessions, tokens),
      getDashboard,
      notes: new Notes(notes, clock),
      calendar,
      externalCalendars,
      getMetrics,
      getTeam,
      settings,
      account: new Account(users, notes, events, externalCalendars, settings, clock),
      getStandup,
      personalGitHubToken: new PersonalGitHubToken(profiles, githubTokens, [
        getMetrics,
        getTeam,
        getStandup,
      ]),
    },
  }

  return {
    deps,
    users,
    sessions,
    tokens,
    cipher,
    clock,
    createSession,
    githubWork,
    oauth,
    githubTokens,
    profiles,
    notes,
    events,
    snapshotCache,
    activity,
    subscriptions,
    icsFetcher,
    pushRepository,
    pushSender,
    settingsRepository,
  }
}

export async function createTestApp(options?: Parameters<typeof createTestContext>[0]) {
  const context = createTestContext(options)
  const app = await buildApp(context.deps)
  return { ...context, app }
}

/** Extrai "nome=valor" dos Set-Cookie de uma resposta, para reenviar. */
export function cookieHeader(setCookie: string | string[] | undefined): string {
  const list = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  return list.map((c) => c.split(';')[0]).join('; ')
}
