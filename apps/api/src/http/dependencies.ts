import type { GitHubOAuth } from '../application/ports/github-oauth.js'
import type { CompleteGitHubLogin } from '../application/use-cases/complete-github-login.js'
import type { GetDashboard } from '../application/use-cases/get-dashboard.js'
import type { GetCurrentUser } from '../application/use-cases/get-current-user.js'
import type { Calendar } from '../application/use-cases/calendar.js'
import type { ExternalCalendars } from '../application/use-cases/external-calendars.js'
import type { GetMetrics } from '../application/use-cases/get-metrics.js'
import type { PushNotifications } from '../application/use-cases/push-notifications.js'
import type { Account } from '../application/use-cases/account.js'
import type { UserSettings } from '../application/use-cases/user-settings.js'
import type { GetTeam } from '../application/use-cases/get-team.js'
import type { GetStandup } from '../application/use-cases/get-standup.js'
import type { Notes } from '../application/use-cases/notes.js'
import type { Logout } from '../application/use-cases/logout.js'
import type { PersonalGitHubToken } from '../application/use-cases/personal-github-token.js'
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
  /** Nulo sem as chaves VAPID: os avisos ficam só com o app aberto. */
  push: {
    notifications: PushNotifications
    /** Segredo do agendador que dispara as rodadas; nulo, a rodada fica fechada. */
    cronSecret: string | null
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
    externalCalendars: ExternalCalendars
    getStandup: GetStandup
    getMetrics: GetMetrics
    getTeam: GetTeam
    settings: UserSettings
    account: Account
    personalGitHubToken: PersonalGitHubToken
  }
}
