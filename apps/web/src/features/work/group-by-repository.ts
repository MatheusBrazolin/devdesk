import type { Issue } from '@devdesk/shared'

/** Agrupa por repositório, com os repositórios mais movimentados primeiro. */
export function groupByRepository(issues: Issue[]): [string, Issue[]][] {
  const groups = new Map<string, Issue[]>()
  for (const issue of issues) {
    groups.set(issue.repository, [...(groups.get(issue.repository) ?? []), issue])
  }
  return [...groups.entries()].sort(
    ([nameA, a], [nameB, b]) => b.length - a.length || nameA.localeCompare(nameB),
  )
}
