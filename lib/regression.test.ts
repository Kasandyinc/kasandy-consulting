import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { STEP_KEYS } from './engine/steps.ts'
import { slotToUTC, utcToPacificParts } from './pacific-time.ts'
import { icsUidFor } from './bookings-hub.ts'

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
    '/outreach/[id]/proposal/preview',
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
  // Replaces the shared-secret contract (INBOUND_EMAIL_SECRET + x-inbound-secret),
  // written before any provider was chosen and never exercised against a real one.
  // Resend Inbound is Svix-signed, not header-secret-authenticated; RESEND_WEBHOOK_SECRET
  // is the value that now stands in for a session, and the fail-closed rule carries over.
  const route = read(join(ROOT, 'app/api/engine/inbound/route.ts'))
  assert.match(route, /RESEND_WEBHOOK_SECRET/, 'the inbound secret check is gone')
  assert.match(route, /status: 503/, 'inbound no longer fails closed when unconfigured')
  assert.match(route, /webhooks\.verify\(/, 'inbound no longer verifies the Resend signature')
})

test('a retried inbound delivery cannot thread the same reply twice', () => {
  // Resend documents that webhook delivery is retried. Without this, two deliveries
  // of one email insert two rows and run the reply-stop trigger twice for one event.
  const route = read(join(ROOT, 'app/api/engine/inbound/route.ts'))
  assert.match(route, /onConflict: 'provider_message_id', ignoreDuplicates: true/,
    'a repeated inbound delivery is no longer deduplicated')
  const migrations = readdirSync(join(ROOT, 'supabase/migrations'))
  const hasIndex = migrations.some((f) =>
    read(join(ROOT, 'supabase/migrations', f)).includes('messages_provider_message_id_uidx'),
  )
  assert.ok(hasIndex, 'the unique index backing inbound idempotency is gone')
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

test('a call that has been and gone still asks for its outcome', () => {
  // A booking left at requested/confirmed/held after its time has no outcome
  // recorded, so Start intake never opens and a no-show is indistinguishable from a
  // call that went well. It only appeared under Calendar → Past, where nothing
  // prompted anyone to look.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/page.tsx'))
  assert.match(
    src,
    /\.in\('status', \['requested', 'confirmed', 'held'\]\)[\s\S]{0,80}\.lt\('starts_at'/,
    'past calls with no outcome dropped off Do next',
  )
  assert.match(src, /pastIds\.has/, 'a past unconfirmed booking is listed twice again')
})

test('nothing infers that a call happened from the notes on it', () => {
  // Meeting notes are routinely written BEFORE a call, as preparation. Treating
  // their presence as evidence the call took place marks no-shows as held — which
  // is exactly the wrong conclusion drawn from this record on 22 Sep 2026.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/page.tsx'))
  assert.doesNotMatch(
    src,
    /meeting_notes[^\n]{0,40}(is\b|!==|not\.is|\?\?)[^\n]{0,20}null[\s\S]{0,200}status/,
    'the dashboard is deciding a booking outcome from whether notes exist',
  )
  assert.doesNotMatch(src, /meeting_notes/, 'Do next reads the notes to decide what happened')
})

test('the dashboard still surfaces the two things the alerts point at', () => {
  // An alert nobody can see is not an alert. "Do next" is where both land.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/page.tsx'))
  assert.match(src, /from\('bookings'\)[\s\S]{0,200}'requested'/, 'new bookings dropped off Do next')
  assert.match(src, /from\('submissions'\)[\s\S]{0,200}'new'/, 'new enquiries dropped off Do next')
})

// ─── 6 · Time and layout are derived, not assumed ───────────────────────────

// Both checks below moved from app/api/bookings/create/route.ts to the files that
// now hold the mail. The route's email bodies were lifted into lib/booking-emails.ts
// so the hub could send the same mail when it creates, moves or cancels a booking;
// the invariants are unchanged, they just have a new address. MAIL_SOURCES is that
// address, and it is a list so a fourth email body cannot be added somewhere these
// two rules do not reach.
const MAIL_SOURCES = [
  'lib/booking-emails.ts',
  'lib/ics.ts',
  'app/api/bookings/create/route.ts',
]

test('the Pacific abbreviation is derived from the date, never hardcoded', () => {
  // Every booking label said "PST". Both real bookings are in September, which is
  // PDT — an hour's difference, in the one line the client acts on.
  //
  // lib/ics.ts was still saying PST in the invite's SUMMARY and DESCRIPTION after
  // the route had been fixed: the same defect, in the attachment rather than the
  // body, surviving because the contract only looked at one file.
  for (const file of MAIL_SOURCES) {
    const src = read(join(ROOT, file))
    assert.doesNotMatch(
      src,
      /\$\{time\} PST|\$\{timeStr\} PST|\$\{f\.time\} PST/,
      `${file} hardcodes a PST label again`,
    )
  }
  // And the derivation still exists where the label is produced.
  for (const file of ['lib/booking-emails.ts', 'lib/ics.ts']) {
    assert.match(
      read(join(ROOT, file)),
      /pacificLabel\(/,
      `${file} no longer derives the zone from the date`,
    )
  }
})

test('the booking emails lay their rows out in a table, not flexbox', () => {
  // Outlook renders HTML through Word, which ignores display:flex and gap entirely:
  // every label ran into its value ("WhenFriday", "TopicTesting") in the mailbox
  // that actually reads these. Now covers the reschedule and cancellation bodies
  // too, which are new and would otherwise have been free to reintroduce it.
  const src = read(join(ROOT, 'lib/booking-emails.ts'))
  const styleBlocks = Array.from(src.matchAll(/<style>([\s\S]*?)<\/style>/g)).map((m) => m[1])
  assert.ok(styleBlocks.length >= 4, 'an email body lost its style block')
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

test('both inbound routes record consent the same way, and only when safe', () => {
  // A contact form and a booking form are the same situation: someone came to us.
  // Both may record an express basis, and both may do it ONLY when the submission is
  // what created the organisation — otherwise anyone who can pass the spam checks
  // unlocks outreach to every contact at a researched prospect by naming it.
  const routes = [
    'lib/forms/record.ts',
    'app/(hub)/hub/(app)/calendar/actions.ts',
  ]
  for (const route of routes) {
    const src = read(join(ROOT, route))
    assert.match(src, /express_inbound_unverified/, `${route} no longer records a consent basis`)
    assert.match(
      src,
      /orgIsNew && contactId/,
      `${route} records consent for an org it did not create — that is consent forgery`,
    )
  }
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

// ─── 8 · AI proposes; a person decides ──────────────────────────────────────
// §8 of the brief: AI drafts only, must respect provenance and the no-fabrication
// rule, and a drafted detail still needs human confirmation before it counts. The
// failure mode here is not a crash — it is a plausible invented fact reaching a
// real person by name, with nothing in the build to catch it.

test('research never writes to orgs on its own', () => {
  // The only path from a proposal into the record is an operator accepting one.
  const route = read(join(ROOT, 'app/api/engine/research/route.ts'))
  assert.doesNotMatch(route, /from\('orgs'\)[\s\S]{0,80}\.update\(/, 'research now edits orgs directly')
  assert.doesNotMatch(route, /stage:/, 'research now advances the stage by itself')
  assert.match(route, /isOperator\(/, 'the research endpoint lost its operator check')
})

test('accepting a claim carries its receipt into the row', () => {
  // orgs_leader_provenance and orgs_detail_provenance refuse these fields without a
  // source and a date. Accepting is where those come from, and they come from the
  // claim's own citation rather than being invented at that moment.
  const actions = read(join(ROOT, 'app/(hub)/hub/(app)/outreach/[id]/actions.ts'))
  const fn = actions.slice(actions.indexOf('export async function acceptResearchClaim'))
  assert.match(fn, /leader_source = claim\.source_url/, 'a leader name can be accepted without its source')
  assert.match(fn, /detail_source = claim\.source_url/, 'a detail can be accepted without its source')
  assert.match(fn, /owner\.org_id !== args\.orgId/, 'a claim can be written onto another organisation')
})

test('a proposed claim cannot exist without a source', () => {
  // The same rule orgs enforces for a stored fact, enforced for a proposed one — so
  // an uncited claim cannot even be offered to a person for acceptance.
  const sql = read(join(ROOT, 'supabase/migrations/20260915000019_org_research.sql'))
  assert.match(sql, /source_url {3}text not null/, 'a claim may now be stored with no source')
  assert.match(sql, /claims_people_are_sourced/, 'a leader name may now be inferred rather than read')
})

test('the model is told its own memory is not a source', () => {
  const research = read(join(ROOT, 'lib/engine/research.ts'))
  assert.match(research, /web_search/, 'research no longer searches, so it answers from recall')
  assert.match(research, /memory is not a source/, 'the no-fabrication instruction has been removed')
})

test('research reads what the organisation has told us, as data', () => {
  // A first email names the funder, the headcount and the real problem — better than
  // anything a small organisation publishes. It is also written by someone outside
  // the company, so it is fenced and labelled evidence rather than instruction.
  const route = read(join(ROOT, 'app/api/engine/research/route.ts'))
  assert.match(route, /from\('messages'\)/, 'research no longer reads their emails')
  assert.match(route, /meeting_notes/, 'research no longer reads the notes from the call')
  const research = read(join(ROOT, 'lib/engine/research.ts'))
  assert.match(research, /NOT instruction/, 'correspondence is no longer fenced off as data')
})

test('the three hard gates on Send for signature are still checked', () => {
  // GST, totals reconciliation, and preview freshness — each names why it refuses.
  // The raw markdown regression this whole layer exists to fix is checked here too:
  // the client signing page and the internal Preview must render through the
  // document component, never mdToHtml's email-shaped output or a raw textarea.
  const send = read(join(ROOT, 'app/(hub)/hub/(app)/outreach/[id]/proposal/actions.ts'))
  assert.match(send, /gstNumber:/, 'the GST gate is no longer passed into proposalBlockers')
  assert.match(send, /currentPreviewHash/, 'the preview-freshness gate is no longer checked at send')

  const delivery = read(join(ROOT, 'lib/engine/delivery.ts'))
  assert.match(delivery, /gate\.gstNumber/, 'proposalBlockers no longer refuses on a missing GST number')
  assert.match(
    delivery,
    /summed !== proposal\.total_cents/,
    'proposalBlockers no longer checks modules against the stored total',
  )
  assert.match(
    delivery,
    /savedPreviewHash !== gate\.currentPreviewHash/,
    'proposalBlockers no longer refuses an unpreviewed or stale-previewed version',
  )
})

test('the client signing page and Preview render through the same document component', () => {
  const client = read(join(ROOT, 'app/(hub)/hub/(client)/proposal/[token]/page.tsx'))
  const preview = read(join(ROOT, 'app/(hub)/hub/(app)/outreach/[id]/proposal/preview/page.tsx'))
  assert.match(client, /ProposalDocument/, 'the client signing page no longer renders the document component')
  assert.match(preview, /ProposalDocument/, 'internal Preview no longer renders the document component')
  // The same import path, not two components that happen to look alike.
  const importLine = /from ['"]@\/app\/\(hub\)\/_components\/ProposalDocument['"]/
  assert.match(client, importLine)
  assert.match(preview, importLine)
})

test('the proposal document renders markdown, never raw', () => {
  const client = read(join(ROOT, 'app/(hub)/hub/(client)/proposal/[token]/page.tsx'))
  assert.doesNotMatch(
    client,
    /dangerouslySetInnerHTML[\s\S]*blueprint_md/,
    'the client page is rendering blueprint_md directly again, bypassing markdown',
  )
})

test('the document logo has a real fallback, not a default', () => {
  // Rule 3 of the brief: the wordmark is a fallback for an empty or broken URL,
  // never the thing rendered by default.
  const logo = read(join(ROOT, 'app/(hub)/_components/ProposalLogo.tsx'))
  assert.match(logo, /<img/, 'the real logo image is no longer rendered')
  assert.match(logo, /kc-doc__wordmark/, 'the text wordmark fallback is gone')
  assert.match(logo, /onError/, 'a broken logo URL no longer falls back at runtime')
})

test('the document stylesheet introduces no new palette or typeface', () => {
  // Every --doc-* token must resolve to a token the hub already defines in
  // app/(hub)/globals.css, and the two font stacks must be the hub's own.
  const globalCss = read(join(ROOT, 'app/(hub)/globals.css'))
  const doc = read(join(ROOT, 'app/(hub)/_components/ProposalDocument.tsx'))
  const hubTokens = new Set(
    Array.from(globalCss.matchAll(/--([a-z0-9-]+):/g)).map((m) => m[1]),
  )
  const mapped = Array.from(doc.matchAll(/--doc-[a-z-]+:\s*var\(--([a-z0-9-]+)\)/g))
  assert.ok(mapped.length >= 9, 'fewer --doc-* tokens are mapped than the reference defined')
  for (const [, target] of mapped) {
    assert.ok(hubTokens.has(target), `--doc-* points at --${target}, which globals.css does not define`)
  }
  assert.doesNotMatch(doc, /#[0-9A-Fa-f]{6}/, 'a raw hex value has crept into the document stylesheet')
})

test('the research brief is still asked for the things a consultant needs', () => {
  // "Flat" research was the model correctly refusing to pad a thin web presence.
  // The fix was telling it where to look, not letting it guess.
  const research = read(join(ROOT, 'lib/engine/research.ts'))
  for (const heading of ['How they are funded', 'How they are run', 'What to ask on the call']) {
    assert.ok(research.includes(heading), `the brief no longer asks for "${heading}"`)
  }
  assert.match(research, /namesake/, 'the wrong-organisation guard has been removed')
})

// ─── 9 · The two halves of the Square config must agree ─────────────────────
// What broke: lib/square.ts read SQUARE_ENVIRONMENT while the brief and
// settings.square_env both say SQUARE_ENV. Setting it exactly as documented left
// the client on Sandbox with nothing on screen to say so — payment links against
// test money while the ledger said production.

test('the Square environment is read under the documented name', () => {
  const src = read(join(ROOT, 'lib/square.ts'))
  assert.match(src, /process\.env\.SQUARE_ENV\b/, 'SQUARE_ENV is no longer read, so the documented name does nothing')
})

test('a Square location mismatch is shown rather than discovered at payment time', () => {
  // The env var decides where links are created; settings decides which payments the
  // database accepts. Disagreement refuses every real payment with a message about
  // the wrong account, which reads as a Square fault rather than a config one.
  const page = read(join(ROOT, 'app/(hub)/hub/(app)/financials/page.tsx'))
  assert.match(page, /square_location_id !== envLocationId/, 'the location mismatch check is gone')
  assert.match(page, /square_env !== envName/, 'the environment mismatch check is gone')
})

test('the Square location can be set without opening a SQL editor', () => {
  // Financials told the operator to set settings.square_location_id and gave no way
  // to do it — the same "documented but unreachable" shape as the orphaned page.
  const panels = read(join(ROOT, 'app/(hub)/hub/(app)/admin/AdminPanels.tsx'))
  assert.match(panels, /squareLocationId/, 'the Square location field has been removed from Settings')
  const actions = read(join(ROOT, 'app/(hub)/hub/(app)/admin/actions.ts'))
  assert.match(actions, /square_location_id: squareLocation/, 'saving no longer writes the Square location')
})

// ─── 10 · Migrations are append-only ────────────────────────────────────────
// An applied migration must never be edited: the database has already run the old
// text, so a change to it silently means the file and the live schema disagree.

test('migration filenames are unique and ordered', () => {
  const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'))
  const numbers = files.map((f) => f.split('_')[0])
  assert.equal(new Set(numbers).size, numbers.length, 'two migrations share a version number')
  assert.deepEqual([...numbers].sort(), numbers, 'migrations are not in filename order')
})

// ─── 10 · The hub can create, move and cancel a booking ─────────────────────
// What broke: the hub could only change a booking's status. The first client who
// no-showed and asked to rebook had to be handled by hand, and the three defects
// below were all sitting in the path that would have done it.

test('a Pacific slot survives the round trip through UTC', () => {
  // Two implementations of one DST rule: the hand-rolled second-Sunday arithmetic in
  // isPDT, used to go Pacific → UTC, and Intl with the real IANA zone, used to come
  // back. The hub stores starts_at as a timestamptz, so every booking it reads makes
  // that trip before the client is told a time. If the two ever disagree, the
  // disagreement IS a wrong meeting time — and nothing else in the toolchain
  // compares them.
  const cases: Array<[string, string]> = [
    ['2026-09-21', '13:25'],
    ['2026-09-21', '15:55'],
    ['2027-01-15', '10:25'],
    ['2026-03-07', '13:00'],  // day before DST starts
    ['2026-03-09', '13:00'],  // day after
    ['2026-10-30', '10:00'],  // day before DST ends
    ['2026-11-02', '13:00'],  // day after
    ['2026-12-31', '17:35'],
  ]
  for (const [dateStr, timeStr] of cases) {
    const back = utcToPacificParts(slotToUTC(dateStr, timeStr))
    assert.deepEqual(
      back,
      { dateStr, timeStr },
      `${dateStr} ${timeStr} Pacific did not survive the round trip`,
    )
  }
})

test('the invite UID is derived from the booking id and has no clock in it', () => {
  // What broke: the UID was `${date}-${time}-${Date.now()}@…` and was never stored.
  // Unreconstructable and unlookupable, so there was no way to send a client an
  // UPDATE for an event they already hold — every reschedule would have arrived as
  // a second event, and every cancellation would have done nothing at all.
  assert.equal(icsUidFor('abc-123'), 'abc-123@kasandyconsulting.com')
  assert.equal(icsUidFor('abc-123'), icsUidFor('abc-123'), 'the UID is not stable')

  const src = read(join(ROOT, 'app/api/bookings/create/route.ts'))
  assert.match(src, /icsUidFor\(/, 'the website no longer derives a stable invite UID')
  assert.doesNotMatch(src, /uid = `.*Date\.now\(\)/, 'a clock is back in the invite UID')
})

test('the invite UID is written on the same insert as the booking', () => {
  // Inserting first and filling the UID in afterwards leaves a window in which a
  // booking exists with no way to update its calendar event.
  const src = read(join(ROOT, 'lib/bookings-hub.ts'))
  assert.match(src, /\.\.\.\(id \? \{ id, ics_uid: icsUidFor\(id\) \} : \{\}\)/,
    'the row no longer carries its own UID')
  assert.match(src, /crypto\.randomUUID\(\)/, 'the id is no longer chosen before the insert')
})

test('rescheduling updates the existing row and never recreates it', () => {
  // The org link, the contact link, the meeting notes and the consent trail all hang
  // off the booking row. A cancel-and-recreate would orphan every one of them while
  // looking, from the calendar, exactly like it had worked.
  const src = read(join(ROOT, 'lib/bookings-hub.ts'))
  const fn = src.slice(src.indexOf('export async function rescheduleHubBooking'))
  const body = fn.slice(0, fn.indexOf('\nexport '))
  assert.match(body, /\.update\(/, 'reschedule no longer updates the row')
  assert.doesNotMatch(body, /\.insert\(/, 'reschedule creates a second row')
  assert.doesNotMatch(body, /\.delete\(/, 'reschedule deletes the original row')
})

test('rescheduling raises the invite sequence', () => {
  // RFC 5545: a calendar client may ignore an update whose SEQUENCE is not higher
  // than the one it holds. A reschedule sent at the old sequence is accepted by us
  // and silently dropped by Outlook — moved everywhere except the client's calendar.
  const src = read(join(ROOT, 'lib/bookings-hub.ts'))
  assert.match(src, /const nextSequence = \(existing\.ics_sequence \?\? 0\) \+ 1/,
    'the invite sequence no longer increments on a move')
  assert.match(read(join(ROOT, 'lib/ics.ts')), /`SEQUENCE:\$\{sequence\}`/,
    'the .ics hardcodes a sequence again')
})

test('a taken slot is decided by the database, not by a prior read', () => {
  // Between a read and a write, the website can take the slot. 23505 from the
  // partial unique index is the only answer that cannot be raced.
  const src = read(join(ROOT, 'lib/bookings-hub.ts'))
  const fn = src.slice(src.indexOf('export async function rescheduleHubBooking'))
  assert.match(fn, /error\.code === '23505'/, 'a moved booking no longer reads the conflict code')
  assert.match(fn, /kind: 'slot_taken'/, 'a conflict is no longer reported as a taken slot')
})

test('every booking email is sent after the write it describes, never before', () => {
  // The same rule the website route already follows. A "rescheduled" notice for a
  // move that hit 23505 is worse than an error the operator can act on.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts'))
  for (const [write, send] of [
    ['rescheduleHubBooking(', 'sendBookingRescheduled('],
    ['createHubBooking(', 'sendBookingCreated('],
    ["update({ status: 'cancelled'", 'sendBookingCancelled('],
  ]) {
    const w = src.indexOf(write)
    const s = src.indexOf(send)
    assert.ok(w !== -1, `${write} is gone from the calendar actions`)
    assert.ok(s !== -1, `${send} is gone from the calendar actions`)
    assert.ok(w < s, `${send} can now fire for a write that did not happen`)
  }
})

test('cancelling tells the client, and no path in the hub cancels silently', () => {
  // What broke: Cancelled changed status and stopped. The slot was released and the
  // hub looked right, while the client kept a calendar entry for a call nobody was
  // going to hold and never heard it was off.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts'))
  assert.match(src, /export async function cancelBooking/, 'the cancellation path is gone')
  assert.match(src, /sendBookingCancelled\(/, 'cancelling no longer emails the client')
  // The old silent path must stay closed.
  const setter = src.slice(src.indexOf('export async function setBookingStatus'))
  const body = setter.slice(0, setter.indexOf('\nexport '))
  assert.match(body, /args\.status === 'cancelled'[\s\S]{0,160}return \{ ok: false/,
    'setBookingStatus can cancel silently again')
})

test('a cancellation .ics can actually remove the event', () => {
  // METHOD:CANCEL under a fresh UID matches nothing in the client's calendar and
  // does nothing at all — and unlike a duplicate, nobody notices, because no new
  // event appears and everyone assumes it worked.
  const ics = read(join(ROOT, 'lib/ics.ts'))
  assert.match(ics, /`METHOD:\$\{method\}`/, 'the .ics method is hardcoded again')
  assert.match(ics, /method === 'CANCEL' \? 'STATUS:CANCELLED'/, 'a cancellation no longer says so')

  const notify = read(join(ROOT, 'lib/booking-notify.ts'))
  assert.match(notify, /attachment\(args\.facts, args\.invite, 'CANCEL'\)/,
    'the cancellation no longer sends a CANCEL invite')
  // It has to carry the UID it is cancelling, which comes from the row.
  assert.match(read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts')),
    /bumpIcsSequence\(args\.bookingId\)/,
    'the cancellation invents a UID instead of reusing the original')
})

test('editing details sends nothing', () => {
  // A system that emails on every edit trains people to stop reading its email,
  // which is how the one that matters — the reschedule — gets missed.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts'))
  const fn = src.slice(src.indexOf('export async function editBookingDetails'))
  const body = fn.slice(0, fn.indexOf('\n// ─── Task 5'))
  assert.doesNotMatch(body, /sendBooking/, 'editing a booking now emails the client')
  assert.doesNotMatch(body, /starts_at/, 'editing can now move a booking without a reschedule')
  assert.match(body, /action: 'booking\.details_edited'/, 'edits are no longer audited')
})

test('every booking a hub action writes is audited', () => {
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts'))
  for (const action of [
    "action: 'booking.rescheduled'",
    "action: 'booking.created'",
    "action: 'booking.details_edited'",
    "action: 'booking.cancelled'",
  ]) {
    assert.ok(src.includes(action), `${action} is no longer written to audit_log`)
  }
})

test('every hub booking action is behind the operator gate', () => {
  // A server action with no auth check is a public endpoint. That is one of the
  // defects this file was started for.
  const src = read(join(ROOT, 'app/(hub)/hub/(app)/calendar/actions.ts'))
  const exported = Array.from(src.matchAll(/export async function (\w+)/g)).map((m) => m[1])
  assert.ok(exported.length >= 9, 'the calendar actions lost an export the gate check covers')
  for (const name of exported) {
    const fn = src.slice(src.indexOf(`export async function ${name}`))
    const body = fn.slice(0, fn.indexOf('\nexport ') === -1 ? undefined : fn.indexOf('\nexport '))
    assert.match(body, /isOperator\(user\?\.email\)/, `${name} has no authorization check`)
  }
})

// ─── 11 · The website's availability and the hub agree ──────────────────────
// What broke: the website read taken slots from Vercel KV, which the hub never
// writes to. A booking created or moved in the hub blocked nothing on the website —
// the visitor was offered the slot, filled in the whole form, and only then hit the
// unique index. The hub's own footer claimed the two could not double-book.

test('website availability reads taken slots from the hub, not from KV', () => {
  const src = read(join(ROOT, 'lib/bookings.ts'))
  assert.match(src, /takenSlotsForDate/, 'availability no longer consults the bookings table')
  const fn = src.slice(src.indexOf('export async function getSlotStatuses'))
  const body = fn.slice(0, fn.indexOf('\nexport '))
  // KV keeps exactly one job: manual blocks, which the hub's schema cannot express.
  assert.match(body, /=== 'blocked'/, 'manually blocked slots are no longer honoured')
})

test('the statuses that hold a slot are the ones the database refuses on', () => {
  // Two statements of one fact: HOLDING_STATUSES in the availability reader, and the
  // WHERE clause of the partial unique index. If the index ever covered a status the
  // reader did not, the website would offer a slot the database would then refuse.
  const code = read(join(ROOT, 'lib/bookings-availability.ts'))
  const fromCode = Array.from(
    code.slice(code.indexOf('HOLDING_STATUSES =')).slice(0, 120).matchAll(/'([a-z_]+)'/g),
  ).map((m) => m[1])

  const migrations = readdirSync(join(ROOT, 'supabase/migrations')).sort()
  let fromSql: string[] | null = null
  for (const file of migrations) {
    const sql = read(join(ROOT, 'supabase/migrations', file))
    const m = sql.match(/bookings_slot_unique[\s\S]{0,200}?where status in \(([^)]+)\)/)
    if (m) fromSql = Array.from(m[1].matchAll(/'([a-z_]+)'/g)).map((x) => x[1])
  }

  assert.ok(fromSql, 'the partial unique index on bookings is gone')
  assert.deepEqual(
    [...fromCode].sort(),
    [...fromSql!].sort(),
    'the website offers slots on a different rule than the database enforces',
  )
})

test('the migration adds the two columns the invite mechanism needs', () => {
  const sql = read(join(ROOT, 'supabase/migrations/20260921000020_booking_reschedule.sql'))
  assert.match(sql, /add column if not exists ics_uid text/)
  assert.match(sql, /add column if not exists ics_sequence integer not null default 0/)
  assert.match(sql, /update bookings[\s\S]{0,120}set ics_uid/, 'existing rows are left without a UID')
})

test('moving a booking brings it back under the slot-protecting index', () => {
  // `bookings_slot_unique` is partial: requested, confirmed, held, and nothing else.
  // A no-show has dropped out of it — and a no-show wanting to rebook is the case
  // this whole feature was built for. Moving the row while it sits outside the index
  // puts the call in a slot the database is not protecting: the website books
  // straight over it, and the conflict check passes while doing nothing.
  const src = read(join(ROOT, 'lib/bookings-hub.ts'))
  const fn = src.slice(src.indexOf('export async function rescheduleHubBooking'))
  const body = fn.slice(0, fn.indexOf('\nexport '))

  assert.match(body, /HOLDS_A_SLOT/, 'a moved booking no longer checks whether it holds its slot')
  assert.match(body, /restored \? \{ status: restored \} : \{\}/,
    'a no-show can be moved into a slot nothing is protecting')

  // The statuses it restores into must be the ones the index actually covers —
  // the third place this same list appears, and the one that would fail silently.
  const listed = Array.from(
    body.slice(body.indexOf('HOLDS_A_SLOT')).slice(0, 120).matchAll(/'([a-z_]+)'/g),
  ).map((m) => m[1])
  const code = read(join(ROOT, 'lib/bookings-availability.ts'))
  const holding = Array.from(
    code.slice(code.indexOf('HOLDING_STATUSES =')).slice(0, 120).matchAll(/'([a-z_]+)'/g),
  ).map((m) => m[1])
  assert.deepEqual([...listed].sort(), [...holding].sort(),
    'reschedule and availability disagree about which statuses hold a slot')
})

// ─── 12 · The stack stays awake, and says when it is not well ───────────────
// What broke: Supabase pauses a free-plan project after seven days without
// activity. The website writes a booking to the hub BEFORE it confirms anything,
// so a paused hub does not merely empty the calendar screen — it turns every
// booking attempt on the public site into a 500.

test('the health endpoint is behind the shared secret', () => {
  // It reports real bookings: how many are unconfirmed, how many are unlinked.
  // An unauthenticated endpoint with no check is one of the defects this file was
  // started for.
  const src = read(join(ROOT, 'app/api/health/route.ts'))
  assert.match(src, /process\.env\.CRON_SECRET/, 'the health check no longer requires a secret')
  assert.match(src, /Bearer \$\{secret\}/, 'the health check no longer checks the bearer token')
  assert.match(src, /status: 401/, 'an unauthorized caller is no longer refused')
})

test('the health check makes a real query, not just a connection', () => {
  // A connection that is opened and dropped is not activity, and a keepalive that
  // does not keep anything alive fails in the one way nobody notices: silently,
  // for seven days, until the project is paused.
  const src = read(join(ROOT, 'app/api/health/route.ts'))
  assert.match(src, /\.from\('bookings'\)[\s\S]{0,200}\.select\(/, 'the health check stopped querying')
})

test('a failed check fails the run and a warning does not', () => {
  // A job that is permanently red is a job nobody reads, which is the same as
  // having no check at all. Warnings are things to do; checks are things broken.
  const src = read(join(ROOT, 'app/api/health/route.ts'))
  assert.match(src, /status: ok \? 200 : 503/, 'a broken check no longer fails the run')
  const wf = read(join(ROOT, '.github/workflows/health-check.yml'))
  assert.match(wf, /::warning::/, 'warnings are no longer surfaced')
  assert.doesNotMatch(
    wf.slice(wf.indexOf('for w in body.get')),
    /sys\.exit\(1\)/,
    'a warning now fails the run, which is how a check stops being read',
  )
})

test('the health schedule leaves a gap shorter than the pause window', () => {
  // Two statements of one fact: the cron day-of-week in the workflow, and the
  // seven-day inactivity window Supabase pauses on. Thinning the schedule to
  // weekly would pass every other check here and pause the database.
  const wf = read(join(ROOT, '.github/workflows/health-check.yml'))
  const cron = wf.match(/- cron: '([^']+)'/)
  assert.ok(cron, 'the health check is no longer scheduled')

  const dow = cron![1].trim().split(/\s+/)[4]
  assert.notEqual(dow, '*', 'unexpected: a daily schedule needs no gap check, but verify intent')

  const days = dow.split(',').map(Number).sort((a, b) => a - b)
  assert.ok(days.length >= 2, 'a single run a week leaves a seven-day gap')

  // Largest gap between consecutive runs, wrapping around the week.
  let worst = 0
  for (let i = 0; i < days.length; i++) {
    const next = days[(i + 1) % days.length]
    const gap = i === days.length - 1 ? next + 7 - days[i] : next - days[i]
    worst = Math.max(worst, gap)
  }
  assert.ok(worst <= 4, `the schedule leaves a ${worst}-day gap; Supabase pauses at 7`)
})

test('the secrets the health workflow needs are documented and demanded', () => {
  // A workflow that passes green while checking nothing is worse than no workflow.
  const wf = read(join(ROOT, '.github/workflows/health-check.yml'))
  assert.match(wf, /Missing repository secret/, 'the workflow no longer fails on missing configuration')
  for (const key of ['HEALTH_URL', 'CRON_SECRET']) {
    assert.ok(wf.includes(key), `${key} is no longer required by the workflow`)
  }
  assert.match(read(join(ROOT, '.env.local.example')), /CRON_SECRET=/, 'CRON_SECRET left undocumented')
})
