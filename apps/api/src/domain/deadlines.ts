import type { Milestone, WorkSnapshot } from './work.js'

export interface Deadline {
  /** A URL da milestone, que é única. */
  id: string
  title: string
  date: string
  url: string
  repository: string
  /** Quantos dos seus PRs e issues abertos estão nela. */
  items: number
}

/** "https://github.com/dono/repo/milestone/3" → "dono/repo". */
export function repositoryOfMilestone(url: string): string {
  const [, owner, repo] = new URL(url).pathname.split('/')
  return owner && repo ? `${owner}/${repo}` : url
}

/**
 * Prazos das milestones dos seus PRs abertos e das suas issues, sem repetir:
 * vários itens na mesma milestone viram um prazo só, com a contagem.
 */
export function milestoneDeadlines(snapshot: WorkSnapshot): Deadline[] {
  const byUrl = new Map<string, Deadline>()
  const items: { milestone: Milestone | null }[] = [
    ...snapshot.authored,
    ...snapshot.reviewRequested,
    ...snapshot.issues,
  ]
  for (const { milestone } of items) {
    if (!milestone?.dueOn) continue
    const existing = byUrl.get(milestone.url)
    if (existing) {
      existing.items += 1
      continue
    }
    byUrl.set(milestone.url, {
      id: milestone.url,
      title: milestone.title,
      date: milestone.dueOn,
      url: milestone.url,
      repository: repositoryOfMilestone(milestone.url),
      items: 1,
    })
  }
  return [...byUrl.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  )
}
