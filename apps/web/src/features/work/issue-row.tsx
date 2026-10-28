import type { Issue } from '@devdesk/shared'
import { CircleDot, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/time'
import { NoteButton } from '@/features/notes/note-button'
import { daysSince, isStale } from './list-filters'
import { t } from '@/lib/i18n'

export function IssueRow({
  issue,
  showRepository = true,
}: {
  issue: Issue
  showRepository?: boolean
}) {
  const stale = isStale(issue)
  return (
    <li
      data-list-item
      className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-elevated/50 has-[a:focus-visible]:bg-elevated/50"
    >
      <CircleDot
        aria-label={t('issue aberta')}
        className="mt-0.5 size-4 shrink-0 text-success"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <a
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          data-list-link
          className="line-clamp-2 text-[13px] font-medium after:absolute after:inset-0 group-hover:underline"
        >
          {issue.title}
        </a>
        <p className="mt-1 truncate text-[12px] text-fg-subtle">
          <span className="font-mono text-[11px]">
            {showRepository ? `${issue.repository}#${issue.number}` : `#${issue.number}`}
          </span>
          {issue.author && ` · ${t('aberta por {autor}', { autor: issue.author.login })}`}
          {' · '}
          <span className={cn(stale && 'text-warning')}>
            {stale
              ? t('parada há {dias} dias', { dias: daysSince(issue.updatedAt) })
              : t('atualizada {quando}', { quando: formatRelative(new Date(issue.updatedAt)) })}
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
      <div className="relative mt-0.5 flex shrink-0 items-center gap-3">
        <NoteButton
          item={{
            kind: 'issue',
            repository: issue.repository,
            number: issue.number,
            url: issue.url,
            title: issue.title,
          }}
        />
        {issue.comments > 0 && (
          <span className="hidden items-center gap-1 font-mono text-[11px] text-fg-subtle sm:flex">
            <MessageSquare className="size-3" />
            {issue.comments}
          </span>
        )}
      </div>
    </li>
  )
}
