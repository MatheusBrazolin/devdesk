import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bell, Database, Users } from 'lucide-react'
import { PageHeader, Reveal } from '@/components/layout/page-header'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { GitHubIcon } from '@/components/ui/github-icon'
import { Skeleton } from '@/components/ui/skeleton'
import { DataSection } from './data-section'
import { GitHubSection } from './github-section'
import { NoticesSection } from './notices-section'
import { settingsQuery } from './queries'
import { TeamSection } from './team-section'

/** Configurações: quais avisos receber, quem forma o time e os seus dados. */
export function SettingsPage() {
  const settings = useQuery(settingsQuery)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        section="/configuracoes"
        subtitle="Escolha de onde vêm os dados do GitHub, os avisos, o time e cuide dos seus dados."
      />

      <Reveal delay={0.04}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitHubIcon className="size-3.5 text-fg-muted" /> Acesso ao GitHub
            </CardTitle>
          </CardHeader>
          <GitHubSection />
        </Card>
      </Reveal>

      <Reveal delay={0.08}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-3.5 text-accent" strokeWidth={2} /> Avisos
            </CardTitle>
          </CardHeader>
          {settings.data ? <NoticesSection settings={settings.data} /> : <SectionSkeleton />}
        </Card>
      </Reveal>

      <Reveal delay={0.12}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-3.5 text-success" strokeWidth={2} /> Repositórios do time
            </CardTitle>
          </CardHeader>
          {settings.data ? <TeamSection settings={settings.data} /> : <SectionSkeleton />}
        </Card>
      </Reveal>

      <Reveal delay={0.16}>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-3.5 text-info" strokeWidth={2} /> Seus dados
            </CardTitle>
            <Link to="/privacidade" className="text-[12px] text-fg-muted hover:text-fg">
              Privacidade
            </Link>
          </CardHeader>
          <DataSection />
        </Card>
      </Reveal>
    </div>
  )
}

function SectionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-3 px-4 py-4">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}
