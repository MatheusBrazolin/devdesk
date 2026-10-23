import type {
  Dashboard,
  Issue as IssueDto,
  PullRequest as PullRequestDto,
  User as UserDto,
} from '@devdesk/shared'
import type { DashboardResult } from '../application/use-cases/get-dashboard.js'
import type { User } from '../domain/user.js'
import type { Issue, PullRequest } from '../domain/work.js'

/** Única saída de usuário para fora da API: escolhe campo a campo. */
export const presentUser = (user: User): UserDto => ({
  id: user.id,
  login: user.login,
  name: user.name,
  avatarUrl: user.avatarUrl,
  isDemo: user.isDemo,
})

const iso = (date: Date) => date.toISOString()

const presentPullRequest = (pr: PullRequest): PullRequestDto => ({
  ...pr,
  createdAt: iso(pr.createdAt),
  updatedAt: iso(pr.updatedAt),
  mergedAt: pr.mergedAt && iso(pr.mergedAt),
})

const presentIssue = (issue: Issue): IssueDto => ({
  ...issue,
  createdAt: iso(issue.createdAt),
  updatedAt: iso(issue.updatedAt),
})

export const presentDashboard = ({ snapshot, attention }: DashboardResult): Dashboard => ({
  fetchedAt: iso(snapshot.fetchedAt),
  isSample: snapshot.isSample,
  summary: {
    reviewRequested: snapshot.totals.reviewRequested,
    openPullRequests: snapshot.totals.authored,
    assignedIssues: snapshot.totals.issues,
    mergedThisWeek: snapshot.totals.merged,
  },
  attention: attention.map((item) => ({
    reason: item.reason,
    pullRequest: presentPullRequest(item.pullRequest),
  })),
  pullRequests: {
    reviewRequested: snapshot.reviewRequested.map(presentPullRequest),
    authored: snapshot.authored.map(presentPullRequest),
    merged: snapshot.merged.map(presentPullRequest),
  },
  issues: snapshot.issues.map(presentIssue),
})
