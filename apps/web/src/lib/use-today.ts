import { useEffect, useState } from 'react'
import { dateKey } from './calendar-dates'

/**
 * A data local de hoje, que muda sozinha à meia-noite. Sem isso, uma aba
 * aberta de um dia para o outro continua achando que é ontem.
 */
export function useToday(): string {
  const [today, setToday] = useState(() => dateKey(new Date()))
  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
    const timer = setTimeout(
      () => setToday(dateKey(new Date())),
      midnight.getTime() - now.getTime(),
    )
    return () => clearTimeout(timer)
  }, [today])
  return today
}
