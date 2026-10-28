import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bell, Database, Languages, Users } from 'lucide-react'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { GitHubIcon } from '@/components/ui/github-icon'
import { LanguageSwitch } from '@/components/ui/language-switch'
import { Skeleton } from '@/components/ui/skeleton'
import { t } from '@/lib/i18n'
import { DataSection } from './data-section'
import { GitHubSection } from './github-section'
import { NoticesSection } from './notices-section'
import { settingsQuery } from './queries'
import { TeamSection } from './team-section'

/** Configurações: quais avisos receber, quem forma o time e os seus dados. */
export function SettingsPage() {
  const settings = useQuery(settingsQuery)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 desk:h-full desk:min-h-0 desk:max-w-none">
      <PageHeader
        section="/configuracoes"
        subtitle={t(
          'Escolha de onde vêm os dados do GitHub, os avisos, o time e cuide dos seus dados.',
        )}
      />

      <div className="grid grid-cols-1 gap-5 desk:min-h-0 desk:flex-1 desk:grid-cols-2 desk:grid-rows-[minmax(0,1fr)]">
        <div className="scroll-thin flex flex-col gap-5 desk:min-h-0 desk:overflow-y-auto desk:pr-1">
          <Reveal delay={0.04}>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitHubIcon className="size-3.5 text-fg-muted" /> {t('Acesso ao GitHub')}
                </CardTitle>
              </CardHeader>
              <GitHubSection />
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="size-3.5 text-accent" strokeWidth={2} /> {t('Avisos')}
                </CardTitle>
              </CardHeader>
              {settings.data ? <NoticesSection settings={settings.data} /> : <SectionSkeleton />}
            </Card>
          </Reveal>
        </div>
        <div className="scroll-thin flex flex-col gap-5 desk:min-h-0 desk:overflow-y-auto desk:pr-1">
          <Reveal delay={0.12}>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="size-3.5 text-success" strokeWidth={2} />{' '}
                  {t('Repositórios do time')}
                </CardTitle>
              </CardHeader>
              {settings.data ? <TeamSection settings={settings.data} /> : <SectionSkeleton />}
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages className="size-3.5 text-info" strokeWidth={2} /> {t('Idioma')}
                </CardTitle>
              </CardHeader>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <p className="min-w-0 flex-1 text-[13px] text-fg-muted">
                  {t(
                    'O idioma do app neste navegador. Os dados de exemplo da demonstração continuam em português.',
                  )}
                </p>
                <LanguageSwitch />
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.2}>
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="size-3.5 text-info" strokeWidth={2} /> {t('Seus dados')}
                </CardTitle>
                <Link to="/privacidade" className="text-[12px] text-fg-muted hover:text-fg">
                  {t('Privacidade')}
                </Link>
              </CardHeader>
              <DataSection />
            </Card>
          </Reveal>
        </div>
      </div>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div aria-busy="true" aria-label={t('Carregando')} className="space-y-3 px-4 py-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
