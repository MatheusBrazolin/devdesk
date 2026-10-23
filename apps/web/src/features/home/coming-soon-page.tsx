import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

interface ComingSoonPageProps {
  title: string
  icon: LucideIcon
  description: string
  stage: string
}

/** Página de uma área que ainda não foi construída: diz o que vem e quando. */
export function ComingSoonPage({ title, icon, description, stage }: ComingSoonPageProps) {
  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Badge>{stage}</Badge>
      </header>
      <Card>
        <EmptyState
          icon={icon}
          title="Ainda não construído"
          description={description}
          className="py-10"
        />
      </Card>
    </div>
  )
}
