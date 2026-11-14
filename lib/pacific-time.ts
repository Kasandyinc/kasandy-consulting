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

/** The one zone this file speaks for. */
const ZONE = 'America/Vancouver'

/**
 * The zone's UTC offset, in minutes, at a given instant — read from the platform's
 * time zone database rather than from a rule written here.
 *
 * This used to be a hand-rolled "second Sunday in March to first Sunday in
 * November". That rule stopped being true on 1 November 2026, when British Columbia
 * moved to permanent daylight time: tzdata 2026e has America/Vancouver (and
 * America/Edmonton) on UTC-7 with no further transitions, while US zones keep
 * switching. The hand-rolled rule went on returning PST, so every booking taken
 * after that date would have been written an hour late — the website would offer
 * 10:25 and the client's calendar would show 11:25.
 *
 * The deeper reason to delete it, though, is not that it was wrong once. It is that
 * a legislature can change this and a hand-written rule can only be corrected by a
 * deploy, while tzdata arrives with the operating system. The client's calendar
 * resolves our invite with its own copy of the same database, so agreeing with
 * tzdata is also the only way to agree with them.
 *
 * Works by formatting the instant in the zone, reading the wall clock back, and
 * taking the difference. Intl is the only interface to tzdata available in both the
 * server and the browser.
 */
function offsetMinutesAt(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(instant)

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  const hour = get('hour') === 24 ? 0 : get('hour')

  const asIfUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'))
  // Whole minutes: every real zone offset is a multiple of one, and the seconds
  // component only carries the rounding of the instant itself.
  return Math.round((asIfUTC - instant.getTime()) / 60_000)
}

/**
 * Whether daylight time is in effect in the zone on a given date.
 *
 * Derived from the abbreviation tzdata reports, so it stays true through a rule
 * change instead of encoding one. Kept because callers read it, but note that under
 * permanent daylight time this is now true all year.
 */
export function isPDT(dateStr: string): boolean {
  return pacificLabel(dateStr) === 'PDT'
}

/** Pacific Time UTC offset in minutes (negative = behind UTC), on a given date. */
export function getPTOffsetMins(dateStr: string): number {
  // Noon, so the answer is not decided by a transition at either end of the day.
  const [y, mo, d] = dateStr.split('-').map(Number)
  return offsetMinutesAt(new Date(Date.UTC(y, mo - 1, d, 12, 0)))
}

/**
 * Convert a Pacific slot (YYYY-MM-DD, HH:MM) to a UTC Date.
 * Safe server-side or client-side.
 *
 * Two passes. The first guesses the instant using the offset in force at the same
 * wall clock read as UTC; the second re-reads the offset at that guess and corrects
 * it. One pass is wrong for any slot within an offset's width of a transition,
 * because the offset used to place it is the one on the wrong side of the boundary.
 */
export function slotToUTC(dateStr: string, timeStr: string): Date {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const [h, m] = timeStr.split(':').map(Number)
  const naive = Date.UTC(y, mo - 1, d, h, m)

  // UTC = local − offset (offset is negative here, so this adds).
  let instant = naive - offsetMinutesAt(new Date(naive)) * 60_000
  instant = naive - offsetMinutesAt(new Date(instant)) * 60_000
  return new Date(instant)
}

/**
 * The Pacific abbreviation for a date — derived, never hardcoded.
 *
 * Every booking label said "PST". September is PDT. A confirmation that names the
 * wrong zone invites the client to arrive an hour out, and the two real bookings
 * taken this week are both in September.
 */
export function pacificLabel(dateStr: string): 'PDT' | 'PST' {
  // The primitive: the abbreviation tzdata itself reports. `isPDT` derives from
  // this rather than the other way round, so there is one reader of the zone
  // database and no rule written twice.
  const [y, mo, d] = dateStr.split('-').map(Number)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    timeZoneName: 'short',
  }).formatToParts(new Date(Date.UTC(y, mo - 1, d, 12, 0)))

  return parts.find((p) => p.type === 'timeZoneName')?.value === 'PDT' ? 'PDT' : 'PST'
}

/**
 * The reverse of `slotToUTC`: a UTC instant back to the Pacific date and time it
 * falls on.
 *
 * Needed because the hub stores `starts_at` as a timestamptz. Everything the client
 * ever sees — the confirmation, the invite, the warning that tells them the call is
 * in Vancouver — is phrased in Pacific, so a booking read back out of the database
 * has to be turned back into the grid coordinates it came from.
 *
 * Uses Intl with the real IANA zone rather than the hand-rolled rule in `isPDT`,
 * because this direction has to be right for instants the slot grid never produced
 * — a hub booking at 09:40, an operator override outside the window. The two are
 * held to agreeing by a round-trip contract in lib/regression.test.ts; a DST rule
 * implemented twice is a wrong meeting time waiting to happen, and this file already
 * says so once.
 */
export function utcToPacificParts(instant: Date): { dateStr: string; timeStr: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).formatToParts(instant)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  // en-CA renders midnight as "24" in some ICU versions; normalise it to 00, which
  // is the same instant and the only form the rest of the code parses.
  const hour = get('hour') === '24' ? '00' : get('hour')

  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    timeStr: `${hour}:${get('minute')}`,
  }
}
