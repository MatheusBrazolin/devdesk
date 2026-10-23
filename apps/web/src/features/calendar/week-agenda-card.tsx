import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { addDaysToKey } from '@/lib/calendar-dates'
import { AgendaList } from './agenda-list'
import { calendarQuery, deadlinesQuery } from './queries'
import { useToday } from '@/lib/use-today'

const DAYS = 7

/** Os próximos sete dias no painel Hoje: eventos, lembretes e prazos. */
export function WeekAgendaCard() {
  const today = useToday()
  const range = { from: today, to: addDaysToKey(today, DAYS - 1) }
  const events = useQuery(calendarQuery(range))
  const deadlines = useQuery(deadlinesQuery(range))

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Agenda da semana</CardTitle>
        <Link to="/calendario" className="text-[12px] text-fg-muted hover:text-fg">
          Abrir calendário
        </Link>
      </CardHeader>
      {events.data ? (
        <AgendaList
          from={today}
          days={DAYS}
          events={events.data.events}
          deadlines={deadlines.data?.deadlines ?? []}
          empty="Nada marcado nos próximos 7 dias."
        />
      ) : (
        <p className="px-4 py-6 text-[13px] text-fg-subtle">Carregando…</p>
      )}
    </Card>
  )
}
