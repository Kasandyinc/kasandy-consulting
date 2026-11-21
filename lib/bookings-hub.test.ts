import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bookingRow, pacificLabel, icsUidFor } from './bookings-hub.ts'

// The hub's live schema, read from the database on 15 Sep 2026 and extended by
// 20260921000020_booking_reschedule.sql. If the insert ever names a column outside
// this set, the row is rejected at runtime with no compiler or type error to warn
// anyone — the exact failure this file exists to prevent.
const BOOKINGS_COLUMNS = new Set([
  'id', 'org_id', 'contact_id', 'name', 'email', 'phone', 'organisation', 'topic',
  'starts_at', 'duration_mins', 'timezone', 'status', 'meeting_link', 'source',
  'notes', 'cancelled_reason', 'created_at', 'updated_at',
  'meeting_notes', 'notes_updated_at', 'linked_by', 'linked_at',
  'ics_uid', 'ics_sequence',
  // 20261121000028 — where an in-person meeting physically is.
  'location',
])

const BOOKING_STATUSES = new Set([
  'requested', 'confirmed', 'held', 'done', 'no_show', 'cancelled',
])

const input = {
  date: '2026-09-18',
  time: '10:25',
  name: '  Khadija Issa ',
  email: '  Khadija@Example.COM ',
  topic: ' Workshop enquiry ',
  visitorTimezone: 'America/Toronto',
  meetingLink: 'https://teams.example/meet',
}

// ─── The mapping matches a schema this code cannot see ──────────────────────

test('every column written exists on the hub table', () => {
  for (const key of Object.keys(bookingRow(input))) {
    assert.ok(BOOKINGS_COLUMNS.has(key), `"${key}" is not a column on bookings`)
  }
})

test('status is a real value of the booking enum', () => {
  assert.ok(BOOKING_STATUSES.has(bookingRow(input).status))
})

test('source is set explicitly, not left to the column default', () => {
  assert.equal(bookingRow(input).source, 'website')
})

// ─── Pacific time, derived rather than assumed ──────────────────────────────

test('a September slot converts at PDT, not PST', () => {
  // 10:25 Pacific on 18 Sep 2026 is UTC-7, so 17:25Z. Treating it as PST would
  // put the call an hour late in the hub and in the invite.
  assert.equal(bookingRow(input).starts_at, '2026-09-18T17:25:00.000Z')
  assert.equal(pacificLabel('2026-09-18'), 'PDT')
})

/**
 * Two tests used to stand here: that a January slot converts at PST, and that the
 * labels flip on the first Sunday in November. Both encoded the old
 * second-Sunday-in-March rule. British Columbia moved to permanent daylight time on
 * 1 November 2026 — tzdata 2026e has America/Vancouver on UTC-7 with no further
 * transitions — so they stopped being true. They were not guarding a regression;
 * they asserted a fact about the law, and the law moved underneath them.
 *
 * What replaces them asserts a fact about the code: that a conversion agrees with
 * the time zone database, whatever the database currently says. A legislature can
 * move the boundary again and these keep working, where the old pair would have to
 * be rewritten each time — which is exactly how they came to be wrong with nobody
 * noticing.
 */

/** The offset tzdata itself reports for a date, in minutes. */
function tzdataOffsetMins(dateStr: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const at = new Date(Date.UTC(y, mo - 1, d, 12, 0))
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(at)
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const h = g('hour') === 24 ? 0 : g('hour')
  return Math.round(
    (Date.UTC(g('year'), g('month') - 1, g('day'), h, g('minute'), g('second')) - at.getTime()) / 60_000,
  )
}

test('a slot converts at the offset the zone database reports, not one of our own', () => {
  for (const date of ['2026-01-15', '2026-07-15', '2026-11-15', '2027-01-15', '2027-07-15']) {
    const [y, mo, d] = date.split('-').map(Number)
    const want = new Date(Date.UTC(y, mo - 1, d, 10, 25) - tzdataOffsetMins(date) * 60_000)
    assert.equal(
      bookingRow({ ...input, date, time: '10:25' }).starts_at,
      want.toISOString(),
      `${date} was converted at an offset tzdata does not agree with`,
    )
  }
})

test('the label matches what the zone database calls that date', () => {
  for (const date of ['2026-01-15', '2026-03-07', '2026-03-08', '2026-07-15', '2026-11-15', '2027-01-15']) {
    const [y, mo, d] = date.split('-').map(Number)
    const fromTzdata = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Vancouver',
      timeZoneName: 'short',
    })
      .formatToParts(new Date(Date.UTC(y, mo - 1, d, 12, 0)))
      .find((p) => p.type === 'timeZoneName')?.value
    assert.equal(pacificLabel(date), fromTzdata, `${date} is labelled differently from tzdata`)
  }
})

test('the March 2026 transition, which the old rule and tzdata both agree on', () => {
  // Kept from the original pair because it is still true and still worth guarding:
  // a conversion that ignored transitions altogether would satisfy both tests above
  // and fail this one.
  assert.equal(pacificLabel('2026-03-07'), 'PST')
  assert.equal(pacificLabel('2026-03-08'), 'PDT')
})

test('no DST rule is written by hand in the time module', () => {
  // The defect this replaces: a second-Sunday-in-March rule in our own code, which
  // a legislature invalidated and which only a deploy could have corrected.
  const src = readFileSync(new URL('./pacific-time.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /nthSunday/, 'a hand-rolled DST rule is back')
  assert.match(src, /America\/Vancouver/, 'the zone is no longer named for the database to resolve')
})

// ─── Fields the hub renders ─────────────────────────────────────────────────

test("the booking's timezone is Pacific, not the visitor's", () => {
  // The hub renders each booking in this timezone. Storing the visitor's would show
  // Jackee her own calendar in the client's local time.
  assert.equal(bookingRow(input).timezone, 'America/Vancouver')
})

test("the visitor's timezone is kept in notes rather than discarded", () => {
  assert.match(bookingRow(input).notes, /America\/Toronto/)
})

test('an unknown visitor timezone does not produce a misleading note', () => {
  for (const tz of ['Unknown', '', null, undefined]) {
    const notes = bookingRow({ ...input, visitorTimezone: tz as string }).notes
    assert.doesNotMatch(notes, /timezone:/i, `leaked a bad timezone for ${JSON.stringify(tz)}`)
  }
})

test('name, email and topic are trimmed and the address lowercased', () => {
  const row = bookingRow(input)
  assert.equal(row.name, 'Khadija Issa')
  assert.equal(row.email, 'khadija@example.com')
  assert.equal(row.topic, 'Workshop enquiry')
})

test('an empty topic becomes null rather than an empty string', () => {
  assert.equal(bookingRow({ ...input, topic: '   ' }).topic, null)
})

test('a missing meeting link becomes null rather than an empty string', () => {
  assert.equal(bookingRow({ ...input, meetingLink: '' }).meeting_link, null)
  assert.equal(bookingRow({ ...input, meetingLink: null }).meeting_link, null)
})

test('the duration matches the slot length the website offers', () => {
  assert.equal(bookingRow(input).duration_mins, 20)
})

// ─── The hub's own bookings ─────────────────────────────────────────────────
// The website is not the only writer any more: Jackee can enter a booking she
// arranged by phone. These hold the two facts that distinguish one.

test('a row carrying an id also carries its invite UID, and both are real columns', () => {
  const row = bookingRow(input, '11111111-2222-3333-4444-555555555555')
  for (const key of Object.keys(row)) {
    assert.ok(BOOKINGS_COLUMNS.has(key), `"${key}" is not a column on bookings`)
  }
  assert.equal(row.ics_uid, icsUidFor('11111111-2222-3333-4444-555555555555'))
})

test('a hub booking is marked as one and starts confirmed', () => {
  // A call agreed on the phone is not awaiting anyone's confirmation, and counting
  // it as a website booking misstates where the work comes from in every funnel
  // that reads the source column.
  const row = bookingRow({ ...input, source: 'hub', status: 'confirmed' })
  assert.equal(row.source, 'hub')
  assert.equal(row.status, 'confirmed')
})

test("a hub booking's provenance note does not claim it came from the website", () => {
  const row = bookingRow({ ...input, source: 'hub', status: 'confirmed' })
  assert.doesNotMatch(row.notes, /from the website/i)
  assert.match(row.notes, /hub/i)
})

test('a website booking is unchanged by any of the above', () => {
  // The defaults are what the public route relies on. If they ever move, every
  // booking taken on the site changes shape without the route being touched.
  const row = bookingRow(input)
  assert.equal(row.source, 'website')
  assert.equal(row.status, 'requested')
  assert.equal(row.duration_mins, 20)
  assert.match(row.notes, /Booked from the website/)
  assert.ok(!('id' in row), 'a website row now carries an id the database did not choose')
})

test('the hub can book a longer call than the website grid offers', () => {
  assert.equal(bookingRow({ ...input, durationMins: 45 }).duration_mins, 45)
})
