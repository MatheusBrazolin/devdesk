import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { addDaysToKey } from '@/lib/calendar-dates'
import { notify } from '@/lib/notifications'
import { calendarQuery } from './queries'
import { noticeEnabled, settingsQuery } from '@/features/settings/queries'
import { useToday } from '@/lib/use-today'

/** Só agenda avisos para as próximas 24 horas; o resto entra quando a página recarregar. */
const HORIZON_MS = 24 * 60 * 60 * 1000

/**
 * Avisa na hora de cada lembrete com horário de hoje e amanhã, enquanto o
 * DevDesk estiver aberto: dentro da página e, com as notificações ligadas e
 * a aba em segundo plano, também no sistema.
 */
export function useReminderToasts(): void {
  const today = useToday()
  const events = useQuery({
    ...calendarQuery({ from: today, to: addDaysToKey(today, 1) }),
    // De hora em hora: lembretes criados noutra aba ou que entram na janela de 24 h.
    refetchInterval: 60 * 60 * 1000,
  })

  const settings = useQuery(settingsQuery).data

  useEffect(() => {
    if (!noticeEnabled(settings, 'agenda')) return
    const now = Date.now()
    const timers = (events.data?.events ?? []).flatMap((event) => {
      if (event.kind !== 'reminder' || event.allDay) return []
      const delay = new Date(event.startsAt).getTime() - now
      if (delay <= 0 || delay > HORIZON_MS) return []
      return [
        setTimeout(
          () =>
            notify({
              title: `Lembrete: ${event.title}`,
              body: event.description || undefined,
              tag: `lembrete:${event.id}`,
              // Compromisso não espera o fim do foco.
              urgent: true,
            }),
          delay,
        ),
      ]
    })
    return () => timers.forEach(clearTimeout)
  }, [events.data, settings])
}
