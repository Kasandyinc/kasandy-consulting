import { slotToUTC, SLOT_DURATION_MINS } from './bookings'

/** Format a Date as a compact UTC ICS timestamp: 20250603T180000Z */
function toICSUTC(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Escape special characters for ICS TEXT fields */
function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

/** Fold long lines per RFC 5545 (max 75 octets per line, continued with CRLF + space) */
function foldLine(line: string): string {
  if (line.length <= 75) return line
  const chunks: string[] = []
  let i = 0
  while (i < line.length) {
    if (i === 0) { chunks.push(line.slice(0, 75)); i = 75 }
    else { chunks.push(' ' + line.slice(i, i + 74)); i += 74 }
  }
  return chunks.join('\r\n')
}

export type ICSParams = {
  dateStr: string    // YYYY-MM-DD
  timeStr: string    // HH:MM (PST)
  clientName: string
  clientEmail: string
  topic: string
  uid: string
}

export function generateICS(p: ICSParams): string {
  const startUTC = slotToUTC(p.dateStr, p.timeStr)
  const endUTC   = new Date(startUTC.getTime() + SLOT_DURATION_MINS * 60 * 1000)
  const nowUTC   = new Date()

  const [year, month, day] = p.dateStr.split('-').map(Number)
  const displayDate = new Date(year, month - 1, day).toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const description = escapeICS(
    `Strategy call with Jackee Kasandy — Kasandy Consulting.\n` +
    `\n` +
    `Topic: ${p.topic}\n` +
    `\n` +
    `⏰ IMPORTANT: This meeting is at ${p.timeStr} PST (Pacific Time, Vancouver BC).\n` +
    `If you are outside of BC, please double-check your local time before joining.\n` +
    `\n` +
    `A virtual meeting link will be sent separately.`
  )

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kasandy Consulting//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',

    'BEGIN:VEVENT',
    `UID:${p.uid}`,
    `DTSTAMP:${toICSUTC(nowUTC)}`,
    `DTSTART:${toICSUTC(startUTC)}`,
    `DTEND:${toICSUTC(endUTC)}`,
    `SUMMARY:Strategy Call — Kasandy Consulting (${p.timeStr} PST)`,
    `DESCRIPTION:${description}`,
    'LOCATION:Virtual — link to follow',
    'ORGANIZER;CN=Kasandy Consulting:mailto:consulting@kasandy.com',
    `ATTENDEE;CN=${escapeICS(p.clientName)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${p.clientEmail}`,
    'ATTENDEE;CN=Jackee Kasandy;RSVP=FALSE;PARTSTAT=ACCEPTED;ROLE=REQ-PARTICIPANT:mailto:jackee.kasandy@bebcsociety.org',
    'ATTENDEE;CN=Jackee Kasandy;RSVP=FALSE;PARTSTAT=ACCEPTED;ROLE=REQ-PARTICIPANT:mailto:jackee@kasandy.com',
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    `COMMENT:${displayDate} at ${p.timeStr} Pacific Time`,
    'END:VEVENT',

    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n')
}
