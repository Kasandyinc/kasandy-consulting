/**
 * Pacific time, and the slot grid defined in it.
 *
 * Extracted from lib/bookings.ts, which imports the KV client — so anything wanting
 * the time maths had to drag a storage SDK along with it. These are pure functions
 * over strings and dates; they belong somewhere with no dependencies, and both the
 * KV layer and the Supabase layer now read them from here rather than each keeping
 * a copy. Two implementations of a DST rule is a wrong meeting time waiting to happen.
 */

/** Length of the call itself, in minutes. */
export const SLOT_DURATION_MINS = 20
/** Spacing between slot start times: 20-min call + 5-min break. */
export const SLOT_SPACING_MINS = 25

/** Parse YYYY-MM-DD safely (avoids UTC-shift bugs from new Date('YYYY-MM-DD')) */
export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Day-of-week for a YYYY-MM-DD string (0=Sun … 6=Sat) */
export function getDayOfWeek(dateStr: string): number {
  return parseDateStr(dateStr).getDay()
}

/**
 * Whether DST (PDT, UTC-7) is in effect in America/Vancouver on a given date.
 * DST runs from the 2nd Sunday in March to the 1st Sunday in November.
 */
export function isPDT(dateStr: string): boolean {
  const date = parseDateStr(dateStr)
  const y = date.getFullYear()

  const nthSunday = (month: number, n: number): Date => {
    const first = new Date(y, month - 1, 1)
    const firstSun = new Date(y, month - 1, 1 + ((7 - first.getDay()) % 7))
    return new Date(firstSun.getTime() + (n - 1) * 7 * 24 * 60 * 60 * 1000)
  }

  const dstStart = nthSunday(3, 2)   // 2nd Sunday of March
  const dstEnd   = nthSunday(11, 1)  // 1st Sunday of November
  return date >= dstStart && date < dstEnd
}

/** Pacific Time UTC offset in minutes (negative = behind UTC) */
export function getPTOffsetMins(dateStr: string): number {
  return isPDT(dateStr) ? -7 * 60 : -8 * 60
}

/**
 * Convert a Pacific slot (YYYY-MM-DD, HH:MM) to a UTC Date.
 * Safe server-side or client-side.
 */
export function slotToUTC(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const offsetMins = getPTOffsetMins(dateStr)
  // UTC = local − offset  (offset is negative so we subtract a negative = add)
  return new Date(Date.UTC(y, mo - 1, d, h, m) - offsetMins * 60 * 1000)
}

/**
 * The Pacific abbreviation for a date — derived, never hardcoded.
 *
 * Every booking label said "PST". September is PDT. A confirmation that names the
 * wrong zone invites the client to arrive an hour out, and the two real bookings
 * taken this week are both in September.
 */
export function pacificLabel(dateStr: string): 'PDT' | 'PST' {
  return isPDT(dateStr) ? 'PDT' : 'PST'
}
