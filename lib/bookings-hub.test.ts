import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bookingRow, pacificLabel } from './bookings-hub.ts'

// The hub's live schema, read from the database on 15 Sep 2026. If the insert ever
// names a column outside this set, the row is rejected at runtime with no compiler
// or type error to warn anyone — the exact failure this file exists to prevent.
const BOOKINGS_COLUMNS = new Set([
  'id', 'org_id', 'contact_id', 'name', 'email', 'phone', 'organisation', 'topic',
  'starts_at', 'duration_mins', 'timezone', 'status', 'meeting_link', 'source',
  'notes', 'cancelled_reason', 'created_at', 'updated_at',
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

test('a January slot converts at PST', () => {
  const row = bookingRow({ ...input, date: '2027-01-15', time: '10:25' })
  assert.equal(row.starts_at, '2027-01-15T18:25:00.000Z')
  assert.equal(pacificLabel('2027-01-15'), 'PST')
})

test('the labels flip on the exact DST boundaries', () => {
  // 2026: DST starts Sun 8 March, ends Sun 1 November.
  assert.equal(pacificLabel('2026-03-07'), 'PST')
  assert.equal(pacificLabel('2026-03-08'), 'PDT')
  assert.equal(pacificLabel('2026-10-31'), 'PDT')
  assert.equal(pacificLabel('2026-11-01'), 'PST')
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
