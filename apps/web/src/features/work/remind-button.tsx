import type { PullRequest } from '@devdesk/shared'
import { BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { reminderMessage } from './reminder'

/** Copia um lembrete pronto para quem revisa (Slack, Teams ou o próprio PR). */
export function RemindButton({ pullRequest }: { pullRequest: PullRequest }) {
  const copy = async () => {
    const text = reminderMessage(pullRequest)
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Lembrete copiado', { description: 'Cole no Slack, no Teams ou no PR.' })
    } catch {
      toast.error('Não deu para copiar sozinho', { description: text })
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copiar lembrete para quem revisa ${pullRequest.repository}#${pullRequest.number}`}
      title="Copiar lembrete para quem revisa"
      className="relative z-10 grid size-7 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-elevated hover:text-accent"
    >
      <BellRing className="size-3.5" />
    </button>
  )
}
