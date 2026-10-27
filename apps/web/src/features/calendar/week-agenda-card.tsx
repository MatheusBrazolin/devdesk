import { CalendarDays } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/cn'
import { addDaysToKey } from '@/lib/calendar-dates'
import { AgendaList, AgendaSkeleton } from './agenda-list'
import { deadlinesQuery } from './queries'
import { useCalendarEvents } from './use-calendar-events'
import { useToday } from '@/lib/use-today'
import { t } from '@/lib/i18n'

const DAYS = 7

/** Os próximos sete dias no painel Hoje: eventos, lembretes e prazos. */
export function WeekAgendaCard({ className }: { className?: string }) {
  const today = useToday()
  const range = { from: today, to: addDaysToKey(today, DAYS - 1) }
  const events = useCalendarEvents(range)
  const deadlines = useQuery(deadlinesQuery(range))

  return (
    <Card className={cn('flex flex-col overflow-hidden', className)}>
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          <CalendarDays className="size-3.5 shrink-0 text-info" strokeWidth={2} />
          {t('Agenda da semana')}
        </CardTitle>
        <Link to="/calendario" className="shrink-0 text-[12px] text-fg-muted hover:text-fg">
          {t('Abrir')}
        </Link>
      </CardHeader>
      <CardBody>
        {events.data ? (
          <AgendaList
            from={today}
            days={DAYS}
            events={events.data.events}
            deadlines={deadlines.data?.deadlines ?? []}
            empty={t('Nada marcado nos próximos 7 dias.')}
          />
        ) : (
          <AgendaSkeleton />
        )}
      </CardBody>
    </Card>
  )
}
