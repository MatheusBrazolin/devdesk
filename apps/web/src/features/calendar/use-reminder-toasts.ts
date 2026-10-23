import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { addDaysToKey } from '@/lib/calendar-dates'
import { calendarQuery } from './queries'
import { useToday } from '@/lib/use-today'

/** Só agenda avisos para as próximas 24 horas; o resto entra quando a página recarregar. */
const HORIZON_MS = 24 * 60 * 60 * 1000

/**
 * Avisa na hora de cada lembrete com horário de hoje e amanhã, enquanto o
 * DevDesk estiver aberto. Sem permissão de notificação do sistema: é um aviso
 * dentro da página.
 */
export function useReminderToasts(): void {
  const today = useToday()
  const events = useQuery({
    ...calendarQuery({ from: today, to: addDaysToKey(today, 1) }),
    // De hora em hora: lembretes criados noutra aba ou que entram na janela de 24 h.
    refetchInterval: 60 * 60 * 1000,
  })

  useEffect(() => {
    const now = Date.now()
    const timers = (events.data?.events ?? []).flatMap((event) => {
      if (event.kind !== 'reminder' || event.allDay) return []
      const delay = new Date(event.startsAt).getTime() - now
      if (delay <= 0 || delay > HORIZON_MS) return []
      return [
        setTimeout(
          () =>
            toast(`Lembrete: ${event.title}`, {
              description: event.description || undefined,
              duration: 15_000,
            }),
          delay,
        ),
      ]
    })
    return () => timers.forEach(clearTimeout)
  }, [events.data])
}
