/**
 * Agenda de exemplo do modo demonstração, em .ics de verdade: passa pelo
 * mesmo leitor das agendas assinadas, com fuso, repetições e uma exceção.
 */
export const SAMPLE_CALENDAR = { id: 'exemplo', name: 'Agenda de exemplo' } as const

const event = (...lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT']

export const SAMPLE_ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//DevDesk//Agenda de exemplo//PT',
  'BEGIN:VTIMEZONE',
  'TZID:America/Sao_Paulo',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:-0300',
  'TZOFFSETTO:-0300',
  'TZNAME:-03',
  'DTSTART:19700101T000000',
  'END:STANDARD',
  'END:VTIMEZONE',
  ...event(
    'UID:daily@exemplo',
    'SUMMARY:Daily do time',
    'LOCATION:Google Meet',
    'DTSTART;TZID=America/Sao_Paulo:20260105T093000',
    'DTEND;TZID=America/Sao_Paulo:20260105T094500',
    'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  ),
  ...event(
    'UID:planejamento@exemplo',
    'SUMMARY:Planejamento da sprint',
    'DTSTART;TZID=America/Sao_Paulo:20260105T140000',
    'DTEND;TZID=America/Sao_Paulo:20260105T150000',
    'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO',
  ),
  ...event(
    'UID:1on1@exemplo',
    'SUMMARY:1:1 com a liderança',
    'DTSTART;TZID=America/Sao_Paulo:20260108T160000',
    'DTEND;TZID=America/Sao_Paulo:20260108T163000',
    'RRULE:FREQ=WEEKLY;BYDAY=TH',
  ),
  ...event(
    'UID:arquitetura@exemplo',
    'SUMMARY:Conversa de arquitetura',
    'DTSTART;TZID=America/Sao_Paulo:20260106T110000',
    'DTEND;TZID=America/Sao_Paulo:20260106T120000',
    'RRULE:FREQ=WEEKLY;BYDAY=TU,FR',
  ),
  'END:VCALENDAR',
].join('\r\n')
