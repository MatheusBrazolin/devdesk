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
import { plural, t } from '@/lib/i18n'
import { formatRelative } from '@/lib/time'
import { NoteButton } from '@/features/notes/note-button'
import { REASON_LABEL } from './labels'
import { RemindButton } from './remind-button'
import { daysSince, isStale, ownerOf } from './list-filters'
import {
  changedLines,
  estimateMinutes,
  formatEstimate,
  formatWaiting,
  hoursWaiting,
  isOverdue,
} from './review-queue'

interface PullRequestRowProps {
  pullRequest: PullRequest
  reason?: AttentionReason
  /** Esconde o autor quando a lista é toda de PRs seus. */
  showAuthor?: boolean
  /** Review pedida a você: mostra espera, tamanho e tempo estimado. */
  review?: boolean
}

export function PullRequestRow({
  pullRequest: pr,
  reason,
  showAuthor = true,
  review = reason === 'review_requested',
}: PullRequestRowProps) {
  const merged = pr.mergedAt !== null
  const Icon = merged ? GitMerge : pr.isDraft ? GitPullRequestDraft : GitPullRequest
  const stale = !merged && isStale(pr)

  return (
    <li
      data-list-item
      className="group relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-elevated/50 has-[a:focus-visible]:bg-elevated/50"
    >
      <Icon
        aria-label={merged ? t('mergeado') : pr.isDraft ? t('rascunho') : t('aberto')}
        className={cn(
          'mt-0.5 size-4 shrink-0',
          merged ? 'text-fg-subtle' : pr.isDraft ? 'text-fg-subtle' : 'text-success',
        )}
        strokeWidth={1.75}
      />

      <div className="min-w-0 flex-1">
        {/* No celular o selo vem antes do título: ao lado, ele espremia o texto. */}
        {reason && (
          <Badge tone={REASON_LABEL[reason].tone} className="mb-1 sm:hidden">
            {REASON_LABEL[reason].text}
          </Badge>
        )}
        <a
          href={pr.url}
          target="_blank"
          rel="noreferrer"
          data-list-link
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
          {review && !merged ? (
            <ReviewMeta pr={pr} />
          ) : (
            <span className={cn('shrink-0', stale && 'text-warning')}>
              {merged
                ? t('mergeado {quando}', { quando: formatRelative(new Date(pr.mergedAt!)) })
                : stale
                  ? t('parado há {dias} dias', { dias: daysSince(pr.updatedAt) })
                  : t('atualizado {quando}', { quando: formatRelative(new Date(pr.updatedAt)) })}
            </span>
          )}
          {!merged && !review && (
            <span className="hidden shrink-0 lg:inline">
              <Dot /> {openedFor(pr.createdAt)}
            </span>
          )}
        </p>
      </div>

      <div className="relative mt-0.5 flex shrink-0 items-center gap-3">
        {/* PR seu parado: um lembrete pronto para quem revisa. */}
        {stale && !showAuthor && !reason && <RemindButton pullRequest={pr} />}
        <NoteButton
          item={{
            kind: 'pull_request',
            repository: pr.repository,
            number: pr.number,
            url: pr.url,
            title: pr.title,
          }}
        />
        {reason ? (
          <Badge tone={REASON_LABEL[reason].tone} className="hidden sm:inline-flex">
            {REASON_LABEL[reason].text}
          </Badge>
        ) : (
          !merged && <PullRequestStatus pr={pr} />
        )}
        <span
          className={cn(
            'hidden w-8 items-center justify-end gap-1 font-mono text-[11px] text-fg-subtle sm:flex',
            pr.comments === 0 && 'invisible',
          )}
          title={t('{n} comentários', { n: pr.comments })}
        >
          <MessageSquare className="size-3" />
          {pr.comments}
        </span>
      </div>
    </li>
  )
}

/** Na review: há quanto tempo espera (âmbar se atrasou), tempo estimado e tamanho. */
function ReviewMeta({ pr }: { pr: PullRequest }) {
  const minutes = estimateMinutes(pr)
  const lines = changedLines(pr)
  const overdue = isOverdue(pr)
  return (
    <>
      <span className={cn('shrink-0', overdue && 'font-medium text-warning')}>
        {formatWaiting(hoursWaiting(pr))}
      </span>
      {minutes !== null && (
        <span
          className="shrink-0"
          title={t('{linhas} linhas em {arquivos} arquivos', {
            linhas: String(lines),
            arquivos: String(pr.size?.changedFiles),
          })}
        >
          <Dot /> {formatEstimate(minutes)}
          <span className="hidden sm:inline"> · {t('{n} linhas', { n: String(lines) })}</span>
        </span>
      )}
    </>
  )
}

const openedFor = (createdAt: string) =>
  t('aberto {quando}', { quando: formatRelative(new Date(createdAt)) })

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
  if (pr.isDraft) return <Badge>{t('rascunho')}</Badge>

  return (
    <span className="hidden items-center gap-2 sm:flex">
      <CiIndicator status={pr.ciStatus} />
      {pr.mergeable === 'conflicting' ? (
        <Badge tone="danger">{t('conflito')}</Badge>
      ) : pr.reviewDecision === 'changes_requested' ||
        (pr.reviewDecision === null && pr.changesRequested > 0) ? (
        <Badge tone="danger">{t('mudanças pedidas')}</Badge>
      ) : pr.approvals > 0 ? (
        <Badge tone="success">{plural(pr.approvals, '{n} aprovação', '{n} aprovações')}</Badge>
      ) : (
        <span className="text-[12px] text-fg-subtle">{t('sem review')}</span>
      )}
    </span>
  )
}

const CI = {
  success: { icon: Check, text: t('CI ok'), className: 'text-success' },
  failure: { icon: X, text: t('CI falhou'), className: 'text-danger' },
  pending: { icon: CircleDashed, text: t('CI rodando'), className: 'text-warning' },
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
