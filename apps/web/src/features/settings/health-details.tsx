import { useQuery } from '@tanstack/react-query'
import { githubHealthQuery } from './queries'
import { SOURCE_LABELS } from './token-health'
import { LOCALE, t } from '@/lib/i18n'

const dayFormat = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const timeFormat = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })

/** O que o acesso ao GitHub enxerga agora: de onde vem, até quando vale, quais organizações e a cota. */
export function HealthDetails() {
  const health = useQuery(githubHealthQuery)
  if (!health.data) return null
  const data = health.data

  return (
    <dl className="grid gap-x-6 gap-y-2 border-t border-border px-4 py-3 text-[13px] sm:grid-cols-[auto_1fr]">
      <dt className="text-fg-subtle">{t('Dados vêm de')}</dt>
      <dd>{SOURCE_LABELS[data.source]}</dd>

      {data.ok ? (
        <>
          <dt className="text-fg-subtle">{t('Validade')}</dt>
          <dd>
            {data.expiresAt
              ? t('até {date}', { date: dayFormat.format(new Date(data.expiresAt)) })
              : data.source === 'oauth'
                ? t('renova sozinho')
                : t('sem data para vencer')}
          </dd>

          <dt className="text-fg-subtle">{t('Organizações')}</dt>
          <dd>
            {data.organizations.length === 0 ? (
              <span className="text-fg-muted">{t('nenhuma visível')}</span>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {data.organizations.map((org) => (
                  <li
                    key={org.login}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-1.5 py-0.5 font-mono text-[12px]"
                  >
                    {org.avatarUrl && (
                      <img src={org.avatarUrl} alt="" className="size-3.5 rounded-sm" />
                    )}
                    {org.login}
                  </li>
                ))}
              </ul>
            )}
          </dd>

          {data.rateLimit && (
            <>
              <dt className="text-fg-subtle">{t('Cota da API')}</dt>
              <dd>
                {t('{remaining} de {limit} chamadas, renova às {time}', {
                  remaining: data.rateLimit.remaining.toLocaleString(LOCALE),
                  limit: data.rateLimit.limit.toLocaleString(LOCALE),
                  time: timeFormat.format(new Date(data.rateLimit.resetAt)),
                })}
              </dd>
            </>
          )}
        </>
      ) : (
        <>
          <dt className="text-fg-subtle">{t('Situação')}</dt>
          <dd className="text-danger">{t('recusado pelo GitHub (venceu ou foi revogado)')}</dd>
        </>
      )}
    </dl>
  )
}
