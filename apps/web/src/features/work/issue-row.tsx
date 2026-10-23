import type { Issue } from '@devdesk/shared'
import { CircleDot, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/time'
import { daysSince, isStale } from './list-filters'

export function IssueRow({
  issue,
  showRepository = true,
}: {
  issue: Issue
  showRepository?: boolean
}) {
  const stale = isStale(issue)
  return (
    <li className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-elevated/50">
      <CircleDot
        aria-label="issue aberta"
        className="mt-0.5 size-4 shrink-0 text-success"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <a
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 text-[13px] font-medium after:absolute after:inset-0 group-hover:underline"
        >
          {issue.title}
        </a>
        <p className="mt-1 truncate text-[12px] text-fg-subtle">
          <span className="font-mono text-[11px]">
            {showRepository ? `${issue.repository}#${issue.number}` : `#${issue.number}`}
          </span>
          {issue.author && ` · aberta por ${issue.author.login}`}
          {' · '}
          <span className={cn(stale && 'text-accent')}>
            {stale
              ? `parada há ${daysSince(issue.updatedAt)} dias`
              : `atualizada ${formatRelative(new Date(issue.updatedAt))}`}
          </span>
        </p>
        {issue.labels.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {issue.labels.map((label) => (
              <li
                key={label.name}
                className="flex h-5 items-center gap-1.5 rounded border border-border px-1.5 text-[11px] text-fg-muted"
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: `#${label.color}` }}
                />
                {label.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      {issue.comments > 0 && (
        <span className="hidden items-center gap-1 font-mono text-[11px] text-fg-subtle sm:flex">
          <MessageSquare className="size-3" />
          {issue.comments}
        </span>
      )}
    </li>
  )
}
