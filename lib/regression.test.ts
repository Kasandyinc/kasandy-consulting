import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { STEP_KEYS } from './engine/steps.ts'

/**
 * The no-regression rule, as tests rather than a promise.
 *
 * Every check here corresponds to something that actually broke in this build and
 * was invisible to the compiler, the type-checker and the rest of the suite. They
 * share one shape: two places that must agree, written down separately, drifting
 * apart quietly. A green build was never evidence they agreed.
 *
 * A confirmed-working behaviour is protected by adding its invariant here, not by
 * remembering it. If one of these fails, something that used to work has stopped.
 */

const ROOT = join(import.meta.dirname, '..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const ALL_FILES = walk(join(ROOT, 'app')).concat(walk(join(ROOT, 'lib')))
const read = (p: string) => readFileSync(p, 'utf8')

// ─── 1 · The cadence steps agree with the database ──────────────────────────
// What broke: the composer offered PHONE, the save action accepted PHONE, and the
// outreach_drafts constraint allowed only E1/E2/E3. Saving a phone script passed
// every application check and was rejected by Postgres, silently.

test('every step key the app knows is accepted by the database constraint', () => {
  const migrations = readdirSync(join(ROOT, 'supabase/migrations')).sort()
  // The last migration that redefines the constraint is the one in force.
  let allowed: string[] | null = null
  for (const file of migrations) {
    const sql = read(join(ROOT, 'supabase/migrations', file))
    const m = sql.match(/outreach_drafts_step_check[\s\S]{0,200}?check \(step in \(([^)]+)\)\)/)
    if (m) allowed = Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1])
    const inline = sql.match(/step\s+text not null check \(step in \(([^)]+)\)\)/)
    if (inline && !m) allowed = Array.from(inline[1].matchAll(/'([^']+)'/g)).map((x) => x[1])
  }

  assert.ok(allowed, 'no step constraint found in any migration')
  for (const key of STEP_KEYS) {
    assert.ok(allowed!.includes(key), `the app uses step "${key}" but the database rejects it`)
  }
})

test('nothing in the app hard-codes a step list of its own', () => {
  // The whole point of lib/engine/steps.ts is that this list lives in one place.
  const offenders: string[] = []
  for (const file of ALL_FILES) {
    if (!/\.tsx?$/.test(file)) continue
    if (file.endsWith('engine/steps.ts') || file.endsWith('regression.test.ts')) continue
    const src = read(file)
    // A literal array containing 'E1' and 'E2' is a second copy of the cadence.
    if (/\[[^\]]*'E1'[^\]]*'E2'[^\]]*\]/.test(src.replace(/\n/g, ' '))) {
      offenders.push(file.replace(ROOT + '/', ''))
    }
  }
  assert.deepEqual(offenders, [], `these keep their own copy of the step list: ${offenders.join(', ')}`)
})

// ─── 2 · Every server action is authorised ──────────────────────────────────
// What broke: segmentRecipients was exported from a 'use server' file with no
// operator check. Every export in such a file is a callable endpoint, not a private
// helper — one unauthenticated POST would have returned the whole subscriber list.

test("every exported server action checks who is calling it", () => {
  const unguarded: string[] = []

  for (const file of ALL_FILES) {
    if (!file.endsWith('actions.ts')) continue
    const src = read(file)
    if (!/^['"]use server['"]/m.test(src)) continue

    // Client-facing token routes authorise by token, not by session; they are the
    // documented exception and are named individually rather than pattern-matched.
    const rel = file.replace(ROOT + '/', '')
    if (rel.includes('(client)/intake/') || rel.includes('(client)/proposal/')) continue

    for (const m of Array.from(src.matchAll(/export async function (\w+)/g))) {
      const name = m[1]
      const start = m.index ?? 0
      const next = src.indexOf('\nexport async function', start + 1)
      const body = src.slice(start, next === -1 ? undefined : next)

      const guarded =
        /isOperator\(/.test(body) ||
        /await operator\(\)/.test(body) ||
        /requireAdmin\(/.test(body) ||
        /auth\.getUser\(\)/.test(body)

      if (!guarded) unguarded.push(`${rel}:${name}`)
    }
  }

  assert.deepEqual(unguarded, [], `server actions with no caller check: ${unguarded.join(', ')}`)
})

// ─── 3 · Every hub page is reachable ────────────────────────────────────────
// What broke: /outreach/packages built, deployed, and had no link anywhere. A page
// you can only reach by typing the URL has not shipped.

test('every hub page is linked from the navigation or listed as a sub-page', () => {
  const nav = read(join(ROOT, 'app/(hub)/hub/(app)/NavRail.tsx'))

  // Sub-pages reached from within their parent, not from the nav rail.
  const reachedFromParent = [
    '/[...slug]',
    '/outreach/[id]',
    '/outreach/[id]/compose',
    '/outreach/[id]/discovery',
    '/outreach/[id]/proposal',
    '/clients/[id]',
    '/cms/[slug]',
    '/cms/content',
    '/cms/import',
    '/cms/seo',
    '/cms/spam',
    '/cms/submissions',
    '/cms/subscribers',
  ]

  const appDir = join(ROOT, 'app/(hub)/hub/(app)')
  const pages = walk(appDir)
    .filter((f) => f.endsWith('/page.tsx'))
    .map((f) => f.replace(appDir, '').replace('/page.tsx', ''))
    .filter((route) => route !== '')

  const orphans = pages.filter(
    (route) => !reachedFromParent.includes(route) && !nav.includes(`'${route}'`),
  )

  assert.deepEqual(orphans, [], `hub pages nothing links to: ${orphans.join(', ')}`)
})

// ─── 4 · Confirmed behaviours stay confirmed ────────────────────────────────
// Each of these was verified working and could be undone by an unrelated edit.

test('the send-gate still checks the greeting', () => {
  const send = read(join(ROOT, 'lib/engine/send.ts'))
  assert.match(send, /greetingMismatch\(/, 'the wrong-name guard has been removed from checkSend')
})

test('the demo route still records the opening and refuses a bad token', () => {
  const route = read(join(ROOT, 'app/demo/[token]/route.ts'))
  assert.match(route, /\[0-9a-f\]\{32,64\}/, 'the demo token is no longer validated')
  assert.match(route, /demo_views/, 'demo openings are no longer recorded')
  assert.match(route, /injectFrame\(/, 'the demo is served without its framing banner')
})

test('the inbound webhook still fails closed without its secret', () => {
  const route = read(join(ROOT, 'app/api/engine/inbound/route.ts'))
  assert.match(route, /INBOUND_EMAIL_SECRET/, 'the inbound secret check is gone')
  assert.match(route, /status: 503/, 'inbound no longer fails closed when unconfigured')
})

test('the legacy admin cookie is still verified rather than counted', () => {
  const mw = read(join(ROOT, 'middleware.ts'))
  assert.match(mw, /verifyAdminSession\(/, 'the admin gate no longer verifies the signature')
  assert.doesNotMatch(
    mw,
    /admin_session'\)\s*;\s*\n\s*if \(!session\?\.value\)/,
    'the presence-only admin check has come back',
  )
})

test('paid downloads are still checked against the token store', () => {
  const mw = read(join(ROOT, 'middleware.ts'))
  assert.match(mw, /downloadTokenState\(/, 'the paywall is back to checking cookie shape only')
})

test('the newsletter send is still resumable', () => {
  const actions = read(join(ROOT, 'app/(hub)/hub/(app)/marketing/actions.ts'))
  assert.match(actions, /budgetMs/, 'the campaign send lost its time budget and will die mid-list')
  assert.match(actions, /'queued'/, 'the campaign send no longer resumes from the recipient rows')
})

test('a client still cannot be an operator, in both directions', () => {
  const sql = read(join(ROOT, 'supabase/migrations/20260729000014_adversarial_client_role.sql'))
  assert.match(sql, /client_users_not_operator/)
  assert.match(sql, /engine_operators_not_client/)
})

test('public form endpoints still require a form stamp', () => {
  // The hole the July bots used: a direct POST with no stamp was accepted.
  for (const route of [
    'app/api/contact/route.ts',
    'app/api/kenya-waitlist/route.ts',
    'app/api/newsletter/route.ts',
    'app/api/speaking-inquiry/route.ts',
    'app/api/bookings/create/route.ts',
  ]) {
    const src = read(join(ROOT, route))
    assert.match(src, /missingFormStamp\(/, `${route} no longer requires a form stamp`)
    assert.match(src, /verifyTurnstile\(/, `${route} no longer verifies Turnstile`)
  }
})

// ─── 5 · A website booking reaches the hub before anyone is told it exists ──
// What broke: bookings were written to Vercel KV only. The hub reads Supabase, so
// Calendar showed "Nothing booked" while real calls were being confirmed by email.
// Nothing errored, because no Supabase write was ever attempted — the most expensive
// class of defect in this build, and the one a green suite is least able to see.

test('the booking route writes to the hub before it sends anything', () => {
  const src = read(join(ROOT, 'app/api/bookings/create/route.ts'))
  const write = src.indexOf('createHubBooking(')
  const send = src.indexOf('resend.emails.send(')
  assert.ok(write !== -1, 'the booking route no longer writes to the hub at all')
  assert.ok(send !== -1, 'the booking route no longer sends confirmations')
  assert.ok(write < send, 'a confirmation can now be sent for a booking that never saved')
})

test('a taken slot and a failed write both return before the emails', () => {
  const src = read(join(ROOT, 'app/api/bookings/create/route.ts'))
  const send = src.indexOf('resend.emails.send(')
  const taken = src.indexOf("hub.kind === 'slot_taken'")
  const failed = src.indexOf('[bookings/create] hub write failed')
  assert.ok(taken !== -1 && taken < send, 'a slot conflict no longer stops the confirmation')
  assert.ok(failed !== -1 && failed < send, 'a failed hub write is swallowed instead of surfaced')
  assert.match(src, /status: 409/, 'a taken slot no longer answers 409')
})

test('the KV write is a fallback and can no longer refuse a booking', () => {
  // KV's slot check is advisory now: the partial unique index on bookings.starts_at
  // is the authority. A KV failure returning an error would refuse a slot the
  // database has already granted.
  const src = read(join(ROOT, 'app/api/bookings/create/route.ts'))
  assert.match(src, /KV fallback not written/, 'the KV fallback no longer logs its own failure')
  assert.doesNotMatch(
    src,
    /kvResult\.success[\s\S]{0,120}NextResponse\.json\([\s\S]{0,80}status: 4/,
    'a KV failure can refuse a booking the hub accepted',
  )
})

test('a website booking is marked as one, explicitly', () => {
  const src = read(join(ROOT, 'lib/bookings-hub.ts'))
  assert.match(src, /source: 'website'/, "bookings no longer record where they came from")
})

test('both website alerts still fire', () => {
  // M-02 and A-02. They are audit_log lines rather than a notifications table, so
  // nothing but this checks that the call is still made.
  assert.match(
    read(join(ROOT, 'app/api/bookings/create/route.ts')),
    /notifyBookingCreated\(/,
    'M-02 no longer fires on a new booking',
  )
  assert.match(
    read(join(ROOT, 'app/api/contact/route.ts')),
    /notifySubmissionCreated\(/,
    'A-02 no longer fires on a new enquiry',
  )
  for (const f of ['lib/bookings-hub.ts', 'lib/forms/record.ts']) {
    assert.match(read(join(ROOT, f)), /action: 'booking\.created'|action: 'submission\.created'/)
  }
})

test('the dashboard still surfaces the two things the alerts point at', () => {
  // An alert nobody can see is not an alert. "Do next" is where both land.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/page.tsx'))
  assert.match(src, /from\('bookings'\)[\s\S]{0,200}'requested'/, 'new bookings dropped off Do next')
  assert.match(src, /from\('submissions'\)[\s\S]{0,200}'new'/, 'new enquiries dropped off Do next')
})

// ─── 6 · Time and layout are derived, not assumed ───────────────────────────

test('the Pacific abbreviation is derived from the date, never hardcoded', () => {
  // Every booking label said "PST". Both real bookings are in September, which is
  // PDT — an hour's difference, in the one line the client acts on.
  const src = read(join(ROOT, 'app/api/bookings/create/route.ts'))
  assert.match(src, /pacificLabel\(/, 'the zone label is no longer derived from the date')
  assert.doesNotMatch(src, /\$\{time\} PST|at \$\{timeStr\} PST/, 'a hardcoded PST label is back')
})

test('the booking emails lay their rows out in a table, not flexbox', () => {
  // Outlook renders HTML through Word, which ignores display:flex and gap entirely:
  // every label ran into its value ("WhenFriday", "TopicTesting") in the mailbox
  // that actually reads these.
  const src = read(join(ROOT, 'app/api/bookings/create/route.ts'))
  const styleBlocks = Array.from(src.matchAll(/<style>([\s\S]*?)<\/style>/g)).map((m) => m[1])
  for (const block of styleBlocks) {
    assert.doesNotMatch(block, /display:\s*flex/, 'an email row is laid out with flexbox again')
  }
  assert.match(src, /role="presentation"/, 'the email rows are no longer a table')
})

// ─── 7 · The call is joined to the rest of the engine ───────────────────────
// What broke: bookings.meeting_link had been written by the website since day one
// and rendered nowhere, and a website booking arrives with org_id null — which
// startIntakeFromBooking refuses, with no way to supply one. The call happened and
// the platform stopped there.

test('the calendar shows the meeting link rather than only storing it', () => {
  const row = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/BookingRow.tsx'))
  assert.match(row, /href=\{resolvedLink\}/, 'the Join link is no longer rendered')
  assert.match(row, /clipboard\.writeText\(value\)/, 'the link can no longer be copied to forward')
})

test('a meeting link falls back before it gives up', () => {
  // booking → settings → env. The last is why the two backfilled calls have a
  // working Join button without anyone having typed anything in.
  const page = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/page.tsx'))
  assert.match(
    page,
    /default_meeting_link[\s\S]{0,120}process\.env\.MEETING_LINK/,
    'the meeting-link fallback chain has been shortened',
  )
})

test('meeting notes stay out of the provenance column', () => {
  // bookings.notes says where the booking came from. One column holding both a fact
  // about the client and a fact about our own plumbing loses one of them.
  const actions = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts'))
  const body = actions.slice(actions.indexOf('export async function saveMeetingNotes'))
  const payload = body.slice(body.indexOf('.update('), body.indexOf('.eq('))
  assert.match(payload, /meeting_notes:/, 'meeting notes are no longer saved')
  assert.doesNotMatch(
    payload,
    /(^|[{,\s])notes:/,
    'meeting notes are being written into the provenance column',
  )
})

test('a booking can still be attached to an organisation', () => {
  // The single weld between the call and everything that pays for it.
  const actions = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts'))
  assert.match(actions, /export async function linkBookingToOrg/, 'the booking→org weld is gone')
  assert.match(actions, /'0_unverified'/, 'a booking-created org no longer starts unverified')
  assert.match(actions, /ilike\('name', claimed\)/, 'linking no longer matches before it creates')
})

test('an unlinked booking is visible as a problem, not just absent', () => {
  const page = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/page.tsx'))
  assert.match(page, /const unlinked = rows\.filter/, 'unlinked bookings are no longer counted')
})

test('a signature still creates the client, the thing Clients promises', () => {
  // /clients states in prose that a client record is created by acceptance of a
  // proposal and never by hand. That guarantee is a database trigger; if it were
  // removed the page would keep making the claim with nothing behind it.
  const sql = read(join(ROOT, 'supabase/migrations/20260727000007_intake_discovery_proposal.sql'))
  const fn = sql.slice(sql.indexOf('function accept_on_signature'))
  assert.match(fn, /insert into clients/, 'signing a proposal no longer creates the client')
  assert.match(fn, /update orgs set stage = '8_won'/, 'signing no longer moves the org to won')
  assert.match(fn, /ALREADY SIGNED/, 'a proposal can be signed twice again')
})

// ─── 8 · Migrations are append-only ─────────────────────────────────────────
// An applied migration must never be edited: the database has already run the old
// text, so a change to it silently means the file and the live schema disagree.

test('migration filenames are unique and ordered', () => {
  const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'))
  const numbers = files.map((f) => f.split('_')[0])
  assert.equal(new Set(numbers).size, numbers.length, 'two migrations share a version number')
  assert.deepEqual([...numbers].sort(), numbers, 'migrations are not in filename order')
})
