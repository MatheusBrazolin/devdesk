import type { GitHubOAuth } from '../src/application/ports/github-oauth.js'
import type { Clock } from '../src/application/ports/security.js'
import { CompleteGitHubLogin } from '../src/application/use-cases/complete-github-login.js'
import { CreateSession } from '../src/application/use-cases/create-session.js'
import { GetCurrentUser } from '../src/application/use-cases/get-current-user.js'
import { Logout } from '../src/application/use-cases/logout.js'
import { StartDemoSession } from '../src/application/use-cases/start-demo-session.js'
import { buildApp } from '../src/http/app.js'
import type { AppDependencies } from '../src/http/dependencies.js'
import { AesTokenCipher } from '../src/infrastructure/crypto/aes-token-cipher.js'
import { RandomSessionTokens } from '../src/infrastructure/crypto/session-tokens.js'
import {
  InMemorySessionRepository,
  InMemoryUserRepository,
} from '../src/infrastructure/repositories/in-memory.js'

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

export const fakeGitHub: GitHubOAuth = {
  authorizeUrl: (state) => `https://github.com/login/oauth/authorize?state=${state}`,
  exchangeCode: async (code) => {
    if (code !== 'bom') throw new Error('code recusado')
    return 'gho_token_de_teste'
  },
  fetchProfile: async () => ({
    githubId: 583231,
    login: 'octocat',
    name: 'The Octocat',
    avatarUrl: 'https://avatars.githubusercontent.com/u/583231',
  }),
}

export function createTestContext(options: { demoEnabled?: boolean; github?: boolean } = {}) {
  const users = new InMemoryUserRepository()
  const sessions = new InMemorySessionRepository()
  const tokens = new RandomSessionTokens()
  const cipher = new AesTokenCipher(TEST_KEY)
  const clock = new FakeClock()
  const createSession = new CreateSession(sessions, tokens, clock)

  const deps: AppDependencies = {
    config: {
      webOrigin: 'http://web.test',
      secureCookies: false,
      demoEnabled: options.demoEnabled ?? true,
    },
    github:
      options.github === false
        ? null
        : {
            oauth: fakeGitHub,
            completeLogin: new CompleteGitHubLogin(fakeGitHub, users, cipher, createSession),
          },
    useCases: {
      startDemoSession: new StartDemoSession(options.demoEnabled ?? true, users, createSession),
      getCurrentUser: new GetCurrentUser(sessions, users, tokens, clock),
      logout: new Logout(sessions, tokens),
    },
  }

  return { deps, users, sessions, tokens, cipher, clock, createSession }
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
