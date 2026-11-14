import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  gstCents,
  requiresVerification,
  billingBlockers,
  amountsFromSubtotal,
  amountsAgree,
  invoiceBlockers,
  dueOnFrom,
  shouldDraftToday,
  paymentInstructions,
} from './invoice.ts'

// ─── The four real invoices on the SCN engagement ───────────────────────────
// These are the numbers in the signed agreement. If this file ever disagrees with
// them, the agreement is right and the code is wrong.

const SCN = [
  { phase: 'Foundations Workshop', subtotal: 87500, gst: 4375, total: 91875 },
  { phase: 'Governance build — commencement deposit', subtotal: 300000, gst: 15000, total: 315000 },
  { phase: 'In-person governance workshop', subtotal: 150000, gst: 7500, total: 157500 },
  { phase: 'Governance manual and document set', subtotal: 150000, gst: 7500, total: 157500 },
]

test('every SCN invoice computes to the figure in the agreement', () => {
  for (const row of SCN) {
    const a = amountsFromSubtotal(row.subtotal)
    assert.equal(a.taxCents, row.gst, `GST wrong on ${row.phase}`)
    assert.equal(a.totalCents, row.total, `total wrong on ${row.phase}`)
  }
})

test('the four invoices sum to the accepted proposal total', () => {
  // P-0005 is 721875 cents. If the schedule ever stops summing to the document the
  // client signed, somebody is being billed an amount they did not agree to.
  const subtotal = SCN.reduce((s, r) => s + r.subtotal, 0)
  const gst = SCN.reduce((s, r) => s + r.gst, 0)
  const total = SCN.reduce((s, r) => s + r.total, 0)
  assert.equal(subtotal, 687500)
  assert.equal(gst, 34375)
  assert.equal(total, 721875)
  assert.equal(subtotal + gst, total)
})

// ─── GST arithmetic ─────────────────────────────────────────────────────────

test('GST is 5% rounded half-up to the cent', () => {
  assert.equal(gstCents(87500), 4375)
  assert.equal(gstCents(100), 5)
  assert.equal(gstCents(10), 1) // 0.5 rounds up, not to even
  assert.equal(gstCents(30), 2) // 1.5 rounds up
  assert.equal(gstCents(1), 0)
  assert.equal(gstCents(0), 0)
  assert.equal(gstCents(-500), 0)
})

test('a non-integer subtotal is refused rather than silently rounded', () => {
  // A float reaching the tax line is how an invoice ends up a cent out.
  assert.throws(() => gstCents(875.5), /integer number of cents/)
})

test('amountsAgree catches a row whose tax is wrong but whose sum is right', () => {
  // The database check constraint only knows subtotal + tax = total. A row can
  // satisfy it while carrying GST at the wrong rate, and that is still an invoice
  // the client cannot claim against.
  assert.ok(amountsAgree({ subtotal_cents: 87500, tax_cents: 4375, amount_cents: 91875 }))
  assert.ok(!amountsAgree({ subtotal_cents: 87500, tax_cents: 8750, amount_cents: 96250 }))
  assert.ok(!amountsAgree({ subtotal_cents: 87500, tax_cents: 4375, amount_cents: 90000 }))
})

// ─── The gate ───────────────────────────────────────────────────────────────

const ok = {
  subtotal_cents: 87500,
  tax_cents: 4375,
  amount_cents: 91875,
  status: 'draft',
  description: 'Foundations Workshop',
  due_on: '2026-12-22',
}

test('a complete draft has nothing blocking it', () => {
  assert.deepEqual(invoiceBlockers(ok, { gstNumber: '123456789RT0001' }), [])
})

test('a missing GST number blocks issuing', () => {
  // The same hard gate the proposal already applies, for the same reason: without it
  // the client cannot claim the ITC or the PSB rebate, and hers is an audited file.
  for (const n of [null, '', '   ']) {
    const reasons = invoiceBlockers(ok, { gstNumber: n })
    assert.equal(reasons.length, 1)
    assert.match(reasons[0], /No GST number on file/)
    assert.match(reasons[0], /ITC or PSB rebate/)
  }
})

test('a wrong GST figure is named with both numbers', () => {
  const reasons = invoiceBlockers(
    { ...ok, tax_cents: 8750, amount_cents: 96250 },
    { gstNumber: '123456789RT0001' },
  )
  assert.equal(reasons.length, 1)
  assert.match(reasons[0], /GST reads \$87\.50 but 5% of \$875\.00 is \$43\.75/)
})

test('figures that do not add up are reported before the rate is questioned', () => {
  // Reporting both would be confusing: if the sum is wrong, the rate comparison is
  // not the thing to fix first.
  const reasons = invoiceBlockers({ ...ok, amount_cents: 90000 }, { gstNumber: '1RT0001' })
  assert.equal(reasons.length, 1)
  assert.match(reasons[0], /does not equal the total/)
})

test('every blocker is reported at once, not one at a time', () => {
  const reasons = invoiceBlockers(
    { subtotal_cents: 0, tax_cents: 0, amount_cents: 0, status: 'issued', description: '', due_on: null },
    { gstNumber: null },
  )
  assert.ok(reasons.length >= 5, `expected several reasons, got ${reasons.length}`)
})

test('due date is issue date plus 30 days, across a month and a year boundary', () => {
  assert.equal(dueOnFrom('2026-11-14'), '2026-12-14')
  assert.equal(dueOnFrom('2026-12-20'), '2027-01-19')
  assert.equal(dueOnFrom('2027-02-13'), '2027-03-15')
})

// ─── The queue ──────────────────────────────────────────────────────────────

test('the queue never fires on a phase with no date', () => {
  // Phase 3's December date is not confirmed. A queue that guessed it would invoice
  // the client for a workshop that has not been scheduled, let alone delivered.
  assert.equal(shouldDraftToday({ send_on: null }, '2026-12-01'), false)
  assert.equal(shouldDraftToday({ send_on: null }, '2099-01-01'), false)
})

test('the draft is queued one day before the send date', () => {
  // Phase 1: send_on 22 Nov, so the draft appears on the 21st.
  assert.equal(shouldDraftToday({ send_on: '2026-11-22' }, '2026-11-20'), false)
  assert.equal(shouldDraftToday({ send_on: '2026-11-22' }, '2026-11-21'), true)
  assert.equal(shouldDraftToday({ send_on: '2026-11-22' }, '2026-11-22'), true)
})

test('a send date already past still queues rather than being skipped', () => {
  // Phase 2's date is 13 Nov and the path was built after it. A queue that only
  // fired on the exact day would silently skip anything it was late for.
  assert.equal(shouldDraftToday({ send_on: '2026-11-13' }, '2026-11-14'), true)
})

test('phase 4 queues in February, not before', () => {
  assert.equal(shouldDraftToday({ send_on: '2027-02-13' }, '2026-12-31'), false)
  assert.equal(shouldDraftToday({ send_on: '2027-02-13' }, '2027-02-12'), true)
})

// ─── Payment instructions ───────────────────────────────────────────────────

const settings = {
  etransfer_email: 'pay@kasandyconsulting.com',
  eft_details_md: 'Institution 001, Transit 00123, Account 1234567',
  gst_number: '123456789RT0001',
}

test('only the card is a link', () => {
  const given = paymentInstructions(
    { number: 'INV-0001', show_bank_details: false },
    settings,
    'https://squareup.com/pay/abc',
  )
  const links = given.filter((i) => 'url' in i)
  assert.equal(links.length, 1)
  assert.equal(links[0].method, 'card')
})

test('the e-Transfer line carries the address, the invoice number and autodeposit', () => {
  const [, etransfer] = paymentInstructions(
    { number: 'INV-0007', show_bank_details: false },
    settings,
    null,
  )
  assert.equal(etransfer.kind, 'instructions')
  if (etransfer.kind !== 'instructions') return
  assert.equal(etransfer.recipient, 'pay@kasandyconsulting.com')
  // The message line is what matches a bare e-Transfer notification to what it paid.
  assert.equal(etransfer.message, 'INV-0007')
  assert.match(etransfer.note, /autodeposit/i)
})

test('the e-Transfer address is never hardcoded', async () => {
  const src = await import('node:fs').then((fs) =>
    fs.readFileSync(new URL('./invoice.ts', import.meta.url), 'utf8'),
  )
  // An address baked into the code is a payment redirection that ships with a deploy.
  assert.doesNotMatch(src, /[a-z0-9._%+-]+@kasandyconsulting\.com/i)
})

test('with no address on file the e-Transfer option says so rather than rendering blank', () => {
  const [, etransfer] = paymentInstructions(
    { number: 'INV-0001', show_bank_details: false },
    { ...settings, etransfer_email: null },
    null,
  )
  assert.equal(etransfer.kind, 'unavailable')
})

test('bank details are on request by default and printed only when asked for', () => {
  const [, , defaultEft] = paymentInstructions(
    { number: 'INV-0001', show_bank_details: false },
    settings,
    null,
  )
  assert.equal(defaultEft.kind, 'on_request')

  const [, , openedEft] = paymentInstructions(
    { number: 'INV-0001', show_bank_details: true },
    settings,
    null,
  )
  assert.equal(openedEft.kind, 'instructions')
})

test('asking for bank details with none on file falls back to on request', () => {
  // Never render an empty banking block: a blank account number invites a phone call
  // to whoever answers, which is exactly the opening a redirection needs.
  const [, , eft] = paymentInstructions(
    { number: 'INV-0001', show_bank_details: true },
    { ...settings, eft_details_md: null },
    null,
  )
  assert.equal(eft.kind, 'on_request')
})

// ─── What releases a phase's invoice ────────────────────────────────────────
// The client asked to be invoiced before the Foundations Workshop. Under the old
// model the only way to do that was to have her mark the phase verified eight days
// before it happened — a false delivery record, in a file a funder audits.

test('a scheduled phase does not wait for verification', () => {
  assert.equal(requiresVerification({ billing_trigger: 'on_schedule' }), false)
})

test('verification is still the default, and anything unrecognised is treated as one', () => {
  // The safer side: a phase whose trigger is missing, misspelled or newly added
  // bills only after the client confirms delivery, rather than billing immediately.
  assert.equal(requiresVerification({ billing_trigger: 'on_verification' }), true)
  assert.equal(requiresVerification({ billing_trigger: '' }), true)
  assert.equal(requiresVerification({ billing_trigger: 'something_new' }), true)
})

test('a milestone phase is blocked until the client marks it live', () => {
  const phase = {
    billing_trigger: 'on_verification',
    verified_at: null,
    send_on: '2027-02-13',
    name: 'Governance manual and document set',
  }
  const reasons = billingBlockers(phase, '2027-02-12')
  assert.equal(reasons.length, 1)
  assert.match(reasons[0], /bills on verification and the client has not marked it live/)

  assert.deepEqual(billingBlockers({ ...phase, verified_at: '2027-02-14T00:00:00Z' }, '2027-02-14'), [])
})

test('a scheduled phase with no date is blocked, not billed immediately', () => {
  // Phase 3's December date is unconfirmed. "No date" must never read as "now".
  const reasons = billingBlockers(
    { billing_trigger: 'on_schedule', verified_at: null, send_on: null, name: 'In-person governance workshop' },
    '2026-12-01',
  )
  assert.equal(reasons.length, 1)
  assert.match(reasons[0], /no date set yet/)
})

test('a scheduled phase with a date bills without any verification', () => {
  assert.deepEqual(
    billingBlockers(
      { billing_trigger: 'on_schedule', verified_at: null, send_on: '2026-11-22', name: 'Foundations Workshop' },
      '2026-11-21',
    ),
    [],
  )
})

test('the two gates answer different questions and are not collapsed', () => {
  // billingBlockers asks whether we may bill for the work. invoiceBlockers asks
  // whether the document is a lawful tax invoice. They fail for different reasons,
  // and one hiding behind the other is how a defect reaches a client.
  const src = readFileSync(new URL('./invoice.ts', import.meta.url), 'utf8')
  const billing = src.slice(src.indexOf('export function billingBlockers'))
  assert.doesNotMatch(billing.slice(0, 900), /gstNumber/, 'the billing gate now also judges the document')
})
