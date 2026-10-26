import { describe, expect, it } from 'vitest'
import { calendarProvider, parseCalendarUrl } from './external-calendar.js'

describe('parseCalendarUrl', () => {
  it('aceita Google, Outlook e iCloud, e troca webcal por https', () => {
    expect(
      parseCalendarUrl(' https://calendar.google.com/calendar/ical/a/private-b/basic.ics ').href,
    ).toBe('https://calendar.google.com/calendar/ical/a/private-b/basic.ics')
    expect(parseCalendarUrl('webcal://p42-caldav.icloud.com/published/2/abc').href).toBe(
      'https://p42-caldav.icloud.com/published/2/abc',
    )
    expect(
      parseCalendarUrl('https://outlook.office365.com/owa/calendar/x/y/calendar.ics').hostname,
    ).toBe('outlook.office365.com')
  })

  it.each([
    'http://calendar.google.com/calendar/ical/a/basic.ics',
    'https://evil.example.com/agenda.ics',
    'https://calendar.google.com.evil.com/x.ics',
    'https://user:pass@calendar.google.com/x.ics',
    'https://calendar.google.com:8443/x.ics',
    'https://localhost/x.ics',
    'file:///etc/passwd',
    'não é url',
  ])('recusa %s', (raw) => {
    expect(() => parseCalendarUrl(raw)).toThrow()
  })

  it('dá nome ao provedor sem mostrar o endereço', () => {
    expect(calendarProvider('calendar.google.com')).toBe('Google Agenda')
    expect(calendarProvider('p01-caldav.icloud.com')).toBe('iCloud')
    expect(calendarProvider('outlook.live.com')).toBe('Outlook')
  })
})
