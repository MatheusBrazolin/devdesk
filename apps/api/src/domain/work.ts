export interface Actor {
  login: string
  avatarUrl: string | null
}

export interface Milestone {
  title: string
  /** Data do prazo ("2026-10-31"), ou nula. */
  dueOn: string | null
  url: string
}

export type CiStatus = 'success' | 'failure' | 'pending' | null
export type ReviewDecision = 'approved' | 'changes_requested' | 'review_required' | null
export type Mergeable = 'mergeable' | 'conflicting' | 'unknown'

export interface PullRequest {
  id: string
  number: number
  title: string
  url: string
  repository: string
  author: Actor | null
  isDraft: boolean
  createdAt: Date
  updatedAt: Date
  mergedAt: Date | null
  ciStatus: CiStatus
  reviewDecision: ReviewDecision
  mergeable: Mergeable
  approvals: number
  comments: number
  milestone: Milestone | null
}

export interface Issue {
  id: string
  number: number
  title: string
  url: string
  repository: string
  author: Actor | null
  createdAt: Date
  updatedAt: Date
  labels: { name: string; color: string }[]
  comments: number
  milestone: Milestone | null
}

/** O retrato do trabalho de uma pessoa num instante, como veio da fonte. */
export interface WorkSnapshot {
  fetchedAt: Date
  isSample: boolean
  reviewRequested: PullRequest[]
  authored: PullRequest[]
  merged: PullRequest[]
  issues: Issue[]
  /** Totais da busca; as listas podem vir cortadas. */
  totals: {
    reviewRequested: number
    authored: number
    merged: number
    issues: number
  }
}
