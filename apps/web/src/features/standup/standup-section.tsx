import type { StandupItem } from '@devdesk/shared'
import { CircleDot, Eye, GitMerge, GitPullRequest, Hourglass, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { translateDetail } from './detail'

const ICONS: Record<StandupItem['kind'], LucideIcon> = {
  merged: GitMerge,
  opened: GitPullRequest,
  reviewed: Eye,
  closed_issue: CircleDot,
  review_requested: Eye,
  changes_requested: GitPullRequest,
  ci_failed: GitPullRequest,
  conflict: GitPullRequest,
  ready_to_merge: GitMerge,
  waiting_review: Hourglass,
}

/** Uma seção da lista: título, itens com link para o GitHub e o texto de vazio. */
export function StandupSection({
  title,
  items,
  empty,
  extra,
}: {
  title: string
  items: StandupItem[]
  empty: string | null
  extra?: ReactNode[]
}) {
  return (
    <section className="px-4 py-3">
      <h2 className="mb-2 text-[12px] font-semibold text-fg-muted first-letter:uppercase">
        {title}
      </h2>
      <ul className="space-y-1.5">
        {extra}
        {items.map((item) => {
          const Icon = ICONS[item.kind]
          return (
            <li key={`${item.kind}-${item.url}`} className="flex items-start gap-2 text-[13px]">
              <Icon className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" strokeWidth={1.75} />
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 hover:underline"
              >
                <span className="font-mono text-[11px] text-fg-subtle">
                  {item.repository}#{item.number}
                </span>{' '}
                {item.title}
                {item.detail && (
                  <span className="text-fg-subtle"> · {translateDetail(item.detail)}</span>
                )}
              </a>
            </li>
          )
        })}
        {items.length === 0 && !extra && empty && (
          <li className="text-[13px] text-fg-subtle">{empty}</li>
        )}
        {items.length === 0 && extra && Array.isArray(extra) && extra.length === 0 && empty && (
          <li className="text-[13px] text-fg-subtle">{empty}</li>
        )}
      </ul>
    </section>
  )
}
