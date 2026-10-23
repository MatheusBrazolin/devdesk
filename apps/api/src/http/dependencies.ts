import type { GitHubOAuth } from '../application/ports/github-oauth.js'
import type { CompleteGitHubLogin } from '../application/use-cases/complete-github-login.js'
import type { GetDashboard } from '../application/use-cases/get-dashboard.js'
import type { GetCurrentUser } from '../application/use-cases/get-current-user.js'
import type { Calendar } from '../application/use-cases/calendar.js'
import type { Notes } from '../application/use-cases/notes.js'
import type { Logout } from '../application/use-cases/logout.js'
import type { StartPersonalSession } from '../application/use-cases/start-personal-session.js'
import type { StartDemoSession } from '../application/use-cases/start-demo-session.js'

/** Tudo que a camada HTTP recebe pronto. Ela não sabe de banco nem de cripto. */
export interface AppDependencies {
  config: {
    webOrigin: string
    secureCookies: boolean
    demoEnabled: boolean
  }
  /** Nulo quando o OAuth do GitHub não está configurado. */
  github: {
    oauth: GitHubOAuth
    completeLogin: CompleteGitHubLogin
  } | null
  /** Nulo fora do modo pessoal. */
  personal: StartPersonalSession | null
  useCases: {
    startDemoSession: StartDemoSession
    getCurrentUser: GetCurrentUser
    logout: Logout
    getDashboard: GetDashboard
    notes: Notes
    calendar: Calendar
  }
}
