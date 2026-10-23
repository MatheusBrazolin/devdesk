import type { AttentionReason, PullRequest } from '@devdesk/shared'
import {
  Check,
  CircleDashed,
  GitMerge,
  GitPullRequest,
  GitPullRequestDraft,
  MessageSquare,
  X,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { OwnerAvatar } from '@/components/ui/owner-avatar'
import { cn } from '@/lib/cn'
import { formatRelative } from '@/lib/time'
import { REASON_LABEL } from './labels'
import { daysSince, isStale, ownerOf } from './list-filters'

interface PullRequestRowProps {
  pullRequest: PullRequest
  reason?: AttentionReason
  /** Esconde o autor quando a lista é toda de PRs seus. */
  showAuthor?: boolean
}

export function PullRequestRow({
  pullRequest: pr,
  reason,
  showAuthor = true,
}: PullRequestRowProps) {
  const merged = pr.mergedAt !== null
  const Icon = merged ? GitMerge : pr.isDraft ? GitPullRequestDraft : GitPullRequest
  const stale = !merged && isStale(pr)

  return (
    <li className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-elevated/50">
      <Icon
        aria-label={merged ? 'mergeado' : pr.isDraft ? 'rascunho' : 'aberto'}
        className={cn(
          'mt-0.5 size-4 shrink-0',
          merged ? 'text-fg-subtle' : pr.isDraft ? 'text-fg-subtle' : 'text-success',
        )}
        strokeWidth={1.75}
      />

      <div className="min-w-0 flex-1">
        <a
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 text-[13px] font-medium after:absolute after:inset-0 group-hover:underline"
        >
          {pr.title}
        </a>
        <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-fg-subtle">
          <OwnerAvatar owner={ownerOf(pr.repository)} />
          <span className="truncate font-mono text-[11px]">
            {pr.repository}#{pr.number}
          </span>
          {showAuthor && pr.author && (
            <>
              <Dot />
              <Avatar
                name={null}
                login={pr.author.login}
                src={pr.author.avatarUrl}
                className="size-4 text-[7px]"
              />
              <span className="truncate">{pr.author.login}</span>
            </>
          )}
          <Dot />
          <span className={cn('shrink-0', stale && 'text-accent')}>
            {merged
              ? `mergeado ${formatRelative(new Date(pr.mergedAt!))}`
              : stale
                ? `parado há ${daysSince(pr.updatedAt)} dias`
                : `atualizado ${formatRelative(new Date(pr.updatedAt))}`}
          </span>
          {!merged && (
            <span className="hidden shrink-0 lg:inline">
              <Dot /> {openedFor(pr.createdAt)}
            </span>
          )}
        </p>
      </div>

      <div className="relative mt-0.5 flex shrink-0 items-center gap-3">
        {reason ? (
          <Badge tone={REASON_LABEL[reason].tone}>{REASON_LABEL[reason].text}</Badge>
        ) : (
          !merged && <PullRequestStatus pr={pr} />
        )}
        <span
          className={cn(
            'hidden w-8 items-center justify-end gap-1 font-mono text-[11px] text-fg-subtle sm:flex',
            pr.comments === 0 && 'invisible',
          )}
          title={`${pr.comments} comentários`}
        >
          <MessageSquare className="size-3" />
          {pr.comments}
        </span>
      </div>
    </li>
  )
}

const openedFor = (createdAt: string) => `aberto ${formatRelative(new Date(createdAt))}`

const Dot = () => (
  <span aria-hidden className="text-border-strong">
    ·
  </span>
)

/**
 * Estado de um PR aberto. Só ganha destaque o que foge do normal: aguardar
 * review é o estado padrão e aparece discreto.
 */
function PullRequestStatus({ pr }: { pr: PullRequest }) {
  if (pr.isDraft) return <Badge>rascunho</Badge>

  return (
    <span className="hidden items-center gap-2 sm:flex">
      <CiIndicator status={pr.ciStatus} />
      {pr.mergeable === 'conflicting' ? (
        <Badge tone="danger">conflito</Badge>
      ) : pr.reviewDecision === 'changes_requested' ? (
        <Badge tone="danger">mudanças pedidas</Badge>
      ) : pr.approvals > 0 ? (
        <Badge tone="success">
          {pr.approvals} {pr.approvals === 1 ? 'aprovação' : 'aprovações'}
        </Badge>
      ) : (
        <span className="text-[12px] text-fg-subtle">sem review</span>
      )}
    </span>
  )
}

const CI = {
  success: { icon: Check, text: 'CI ok', className: 'text-success' },
  failure: { icon: X, text: 'CI falhou', className: 'text-danger' },
  pending: { icon: CircleDashed, text: 'CI rodando', className: 'text-accent' },
} as const

function CiIndicator({ status }: { status: PullRequest['ciStatus'] }) {
  if (!status) return null
  const { icon: Icon, text, className } = CI[status]
  return (
    <span className={cn('flex items-center gap-1 text-[12px]', className)}>
      <Icon className="size-3.5" />
      {text}
    </span>
  )
}
