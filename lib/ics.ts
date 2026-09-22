import { slotToUTC, pacificLabel } from './pacific-time'

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
  dateStr: string          // YYYY-MM-DD
  timeStr: string          // HH:MM (Pacific)
  clientName: string
  clientEmail: string
  topic: string
  uid: string
  meetingLink: string      // join URL (Microsoft Teams); may be empty
  durationMinutes: number  // length of the call, in minutes
  /**
   * REQUEST creates or updates the event; CANCEL removes it. A cancellation must
   * carry the UID of the invite it is cancelling, or the client's calendar has
   * nothing to match it against and the original event simply stays.
   */
  method?: 'REQUEST' | 'CANCEL'
  /**
   * RFC 5545 SEQUENCE. A calendar client drops an update whose sequence is not
   * higher than the one it already holds, so a reschedule sent at 0 — the value
   * this was hardcoded to — would be accepted by us and ignored by Outlook.
   */
  sequence?: number
}

export function generateICS(p: ICSParams): string {
  const method   = p.method ?? 'REQUEST'
  const sequence = p.sequence ?? 0
  const startUTC = slotToUTC(p.dateStr, p.timeStr)
  const endUTC   = new Date(startUTC.getTime() + p.durationMinutes * 60 * 1000)
  const nowUTC   = new Date()
  const location = p.meetingLink || 'Virtual — link to follow'
  // Derived, never hardcoded — the same rule the confirmation emails already follow.
  // A September invite that says PST invites the client to arrive an hour out.
  const zone     = pacificLabel(p.dateStr)

  const [year, month, day] = p.dateStr.split('-').map(Number)
  const displayDate = new Date(year, month - 1, day).toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const description = escapeICS(
    `Strategy call with Jackee Kasandy — Kasandy Consulting.\n` +
    `\n` +
    `Topic: ${p.topic}\n` +
    `\n` +
    `⏰ IMPORTANT: This meeting is at ${p.timeStr} ${zone} (Pacific Time, Vancouver BC).\n` +
    `If you are outside of BC, please double-check your local time before joining.\n` +
    `\n` +
    (p.meetingLink
      ? `Join the meeting:\n${p.meetingLink}`
      : `A virtual meeting link will be sent separately.`)
  )

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kasandy Consulting//Booking//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,

    'BEGIN:VEVENT',
    `UID:${p.uid}`,
    `DTSTAMP:${toICSUTC(nowUTC)}`,
    `DTSTART:${toICSUTC(startUTC)}`,
    `DTEND:${toICSUTC(endUTC)}`,
    `SUMMARY:Strategy Call — Kasandy Consulting (${p.timeStr} ${zone})`,
    `DESCRIPTION:${description}`,
    `LOCATION:${escapeICS(location)}`,
    ...(p.meetingLink ? [`URL:${p.meetingLink}`] : []),
    'ORGANIZER;CN=Kasandy Consulting:mailto:jackee@kasandyconsulting.com',
    `ATTENDEE;CN=${escapeICS(p.clientName)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${p.clientEmail}`,
    'ATTENDEE;CN=Jackee Kasandy;RSVP=FALSE;PARTSTAT=ACCEPTED;ROLE=REQ-PARTICIPANT:mailto:Jackee.Kasandy@bebcsociety.org',
    method === 'CANCEL' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    `SEQUENCE:${sequence}`,
    `COMMENT:${displayDate} at ${p.timeStr} Pacific Time`,
    'END:VEVENT',

    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n')
}
