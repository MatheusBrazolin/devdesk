import type {
  CalendarEvent as CalendarEventDto,
  Dashboard,
  ExternalEvent as ExternalEventDto,
  Issue as IssueDto,
  Note as NoteDto,
  PullRequest as PullRequestDto,
  Subscription as SubscriptionDto,
  User as UserDto,
} from '@devdesk/shared'
import type { CalendarEvent } from '../domain/calendar-event.js'
import {
  type CalendarSubscription,
  type ExternalCalendarEvents,
  calendarProvider,
} from '../domain/external-calendar.js'
import type { DashboardResult } from '../application/use-cases/get-dashboard.js'
import { type Note, resolveTitle } from '../domain/note.js'
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
  reviewRequestedAt: pr.reviewRequestedAt && iso(pr.reviewRequestedAt),
})

const presentIssue = (issue: Issue): IssueDto => ({
  ...issue,
  createdAt: iso(issue.createdAt),
  updatedAt: iso(issue.updatedAt),
})

export const presentDashboard = ({ snapshot, attention, stale }: DashboardResult): Dashboard => ({
  fetchedAt: iso(snapshot.fetchedAt),
  isSample: snapshot.isSample,
  stale,
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

export const presentNote = (note: Note): NoteDto => ({
  id: note.id,
  title: note.title,
  displayTitle: resolveTitle(note.title, note.body),
  body: note.body,
  tags: note.tags,
  pinned: note.pinned,
  links: note.links,
  createdAt: iso(note.createdAt),
  updatedAt: iso(note.updatedAt),
})

export const presentEvent = (event: CalendarEvent): CalendarEventDto => {
  const base = {
    id: event.id,
    title: event.title,
    description: event.description,
    kind: event.kind,
    link: event.link,
    createdAt: iso(event.createdAt),
    updatedAt: iso(event.updatedAt),
  }
  return event.allDay
    ? { ...base, allDay: true, date: event.date, endDate: event.endDate }
    : {
        ...base,
        allDay: false,
        startsAt: iso(event.startsAt),
        endsAt: event.endsAt && iso(event.endsAt),
      }
}

export const presentSubscription = (subscription: CalendarSubscription): SubscriptionDto => ({
  id: subscription.id,
  name: subscription.name,
  provider: calendarProvider(subscription.host),
  createdAt: iso(subscription.createdAt),
})

export const presentExternalEvents = (calendar: ExternalCalendarEvents): ExternalEventDto[] =>
  calendar.events.map((event) => {
    const base = {
      id: `${calendar.calendarId}:${event.id}`,
      calendarId: calendar.calendarId,
      calendar: calendar.calendar,
      title: event.title,
      location: event.location,
    }
    return event.allDay
      ? { ...base, allDay: true, date: event.date, endDate: event.endDate }
      : {
          ...base,
          allDay: false,
          startsAt: iso(event.startsAt),
          endsAt: event.endsAt && iso(event.endsAt),
        }
  })
