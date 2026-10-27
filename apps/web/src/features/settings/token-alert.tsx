import type { GitHubHealth } from '@devdesk/shared'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GITHUB_LOGIN_URL } from '@/features/auth/queries'
import { cn } from '@/lib/cn'
import { githubHealthQuery } from './queries'
import { TokenConnectForm, TokenSteps } from './token-connect'
import { type TokenAlert, tokenAlert } from './token-health'
import { LOCALE, t } from '@/lib/i18n'

const dayFormat = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' })

const inDays = (days: number) =>
  days === 0 ? t('hoje') : days === 1 ? t('amanhã') : t('em {n} dias', { n: days })

/**
 * Aviso de token que vence logo ou que o GitHub recusou, com o jeito de
 * resolver ali mesmo: colar um token novo, atualizar o do servidor ou
 * entrar de novo, conforme de onde vêm os dados.
 */
export function TokenAlertNotice({ id, className }: { id: string; className?: string }) {
  const health = useQuery(githubHealthQuery).data
  const alert = tokenAlert(health, new Date())
  if (alert.kind === 'none' || !health) return null
  return <TokenAlertBody id={id} alert={alert} health={health} className={className} />
}

/** O corpo do aviso, também usado quando o painel falha por token recusado. */
export function TokenAlertBody({
  id,
  alert,
  health,
  className,
}: {
  id: string
  alert: Exclude<TokenAlert, { kind: 'none' }>
  health: GitHubHealth
  className?: string
}) {
  const refused = alert.kind === 'refused'
  const when =
    alert.kind === 'expiring' && health.ok && health.expiresAt
      ? `${inDays(alert.days)} (${dayFormat.format(new Date(health.expiresAt))})`
      : ''

  return (
    <aside
      aria-label={refused ? t('Token do GitHub recusado') : t('Token do GitHub perto de vencer')}
      className={cn(
        'shrink-0 space-y-3 rounded-lg border px-4 py-3',
        refused ? 'border-danger/30 bg-danger/8' : 'border-warning/30 bg-warning/8',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {refused ? (
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
        ) : (
          <KeyRound className="mt-0.5 size-4 shrink-0 text-warning" />
        )}
        <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-fg-muted">
          {alert.source === 'personal' &&
            (refused ? (
              <>
                <span className="font-medium text-fg">
                  {t('O GitHub recusou o seu token pessoal.')}
                </span>{' '}
                {t('Ele venceu ou foi revogado. Gere outro e cole abaixo: o painel volta na hora.')}
              </>
            ) : (
              <>
                <span className="font-medium text-fg">
                  {t('Seu token pessoal vence {when}.', { when })}
                </span>{' '}
                {t('Gere outro e cole abaixo antes disso, para o painel não esvaziar.')}
              </>
            ))}
          {alert.source === 'server' && (
            <>
              <span className="font-medium text-fg">
                {refused
                  ? t('O GitHub recusou o token configurado no servidor.')
                  : t('O token configurado no servidor vence {when}.', { when })}
              </span>{' '}
              {t('Gere outro em github.com/settings/tokens e troque a variável')}{' '}
              <code className="font-mono text-[12px]">GITHUB_PERSONAL_TOKEN</code> {t('no Render.')}
            </>
          )}
          {alert.source === 'oauth' && (
            <>
              <span className="font-medium text-fg">
                {t('O GitHub não aceitou mais o acesso.')}
              </span>{' '}
              {t('Entre de novo para continuar.')}
            </>
          )}
        </p>
      </div>
      {alert.source === 'personal' && (
        <div className="space-y-3 pl-7">
          <TokenSteps />
          <TokenConnectForm id={id} />
        </div>
      )}
      {alert.source === 'oauth' && (
        <div className="pl-7">
          <Button onClick={() => window.location.assign(GITHUB_LOGIN_URL)}>
            {t('Entrar de novo')}
          </Button>
        </div>
      )}
    </aside>
  )
}
