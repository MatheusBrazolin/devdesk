import type { CalendarEvent } from '../../domain/calendar-event.js'

/** Omit que respeita a união: dia inteiro e com horário continuam distintos. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type NewEvent = DistributiveOmit<CalendarEvent, 'id'>
export type EventContent = DistributiveOmit<
  CalendarEvent,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>

export interface EventRepository {
  /**
   * Eventos que tocam o intervalo [from, to] de datas. Os com horário vêm com
   * folga de um dia de cada lado, porque o dia local depende do fuso de quem
   * olha; o front recorta no fuso dele.
   */
  listBetween(userId: string, from: string, to: string): Promise<CalendarEvent[]>
  /** Todos os eventos da pessoa, para a exportação dos dados. */
  listAll(userId: string): Promise<CalendarEvent[]>
  findById(userId: string, id: string): Promise<CalendarEvent | null>
  create(event: NewEvent): Promise<CalendarEvent>
  replace(
    userId: string,
    id: string,
    content: EventContent,
    updatedAt: Date,
  ): Promise<CalendarEvent | null>
  delete(userId: string, id: string): Promise<boolean>
}
