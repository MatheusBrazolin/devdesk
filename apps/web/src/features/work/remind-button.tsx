import type { PullRequest } from '@devdesk/shared'
import { BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { t } from '@/lib/i18n'
import { reminderMessage } from './reminder'

/** Copia um lembrete pronto para quem revisa (Slack, Teams ou o próprio PR). */
export function RemindButton({
  pullRequest,
  className,
}: {
  pullRequest: PullRequest
  className?: string
}) {
  const copy = async () => {
    const text = reminderMessage(pullRequest)
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('Lembrete copiado'), { description: t('Cole no Slack, no Teams ou no PR.') })
    } catch {
      toast.error(t('Não deu para copiar sozinho'), { description: text })
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={t('Copiar lembrete para quem revisa {pr}', {
        pr: `${pullRequest.repository}#${pullRequest.number}`,
      })}
      title={t('Copiar lembrete para quem revisa')}
      className={
        className ??
        'relative z-10 grid size-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-elevated hover:text-accent'
      }
    >
      <BellRing className="size-3.5" />
    </button>
  )
}
