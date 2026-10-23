/** Referência a um PR ou issue: o bastante para citar no standup. */
export interface WorkRef {
  title: string
  url: string
  repository: string
  number: number
}

export type ReviewVerdict = 'approved' | 'changes_requested' | 'commented'

/** O que alguém fez no GitHub num período. */
export interface Activity {
  merged: WorkRef[]
  opened: WorkRef[]
  reviewed: (WorkRef & { verdict: ReviewVerdict })[]
  closedIssues: WorkRef[]
}
