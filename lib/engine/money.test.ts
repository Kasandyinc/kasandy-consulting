import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMoney,
  paidCents,
  balanceCents,
  daysOverdue,
  dunningLevel,
  agingBucket,
  summarise,
  type Invoice,
  type Payment,
} from './money.ts'

const inv = (over: Partial<Invoice> = {}): Invoice => ({
  id: 'i1',
  number: 'INV-1',
  client_id: 'c1',
  engagement_id: null,
  description: null,
  amount_cents: 500_000,
  currency: 'CAD',
  status: 'issued',
  requires_verification: false,
  issued_on: '2026-07-01',
  due_on: '2026-07-15',
  paid_at: null,
  ...over,
})

const pay = (over: Partial<Payment> = {}): Payment => ({
  id: 'p1',
  invoice_id: 'i1',
  amount_cents: 100_000,
  currency: 'CAD',
  method: 'e_transfer',
  received_on: '2026-07-10',
  reference: null,
  square_location_id: null,
  ...over,
})

const TODAY = new Date('2026-07-27T12:00:00Z')

test('money formats as Canadian currency from integer cents', () => {
  assert.equal(formatMoney(500_000), '$5,000.00')
  assert.equal(formatMoney(1), '$0.01')
})

test('a balance is the invoice less every payment against it', () => {
  const i = inv()
  const payments = [pay({ amount_cents: 100_000 }), pay({ id: 'p2', amount_cents: 150_000 })]
  assert.equal(paidCents('i1', payments), 250_000)
  assert.equal(balanceCents(i, payments), 250_000)
})

test('payments for other invoices are not counted', () => {
  assert.equal(paidCents('i1', [pay({ invoice_id: 'other', amount_cents: 999 })]), 0)
})

test('an overpayment never produces a negative balance', () => {
  assert.equal(balanceCents(inv(), [pay({ amount_cents: 900_000 })]), 0)
})

test('days overdue counts only past the due date', () => {
  assert.equal(daysOverdue(inv({ due_on: '2026-07-27' }), TODAY), 0)
  assert.equal(daysOverdue(inv({ due_on: '2026-07-28' }), TODAY), 0) // not yet due
  assert.equal(daysOverdue(inv({ due_on: '2026-07-15' }), TODAY), 12)
})

test('paid, void and draft invoices are never overdue', () => {
  for (const status of ['paid', 'void', 'draft'] as const) {
    assert.equal(daysOverdue(inv({ due_on: '2026-01-01', status }), TODAY), 0)
  }
})

test('the dunning ladder escalates with age and starts at nothing owed', () => {
  assert.equal(dunningLevel(inv({ due_on: '2026-08-30' }), TODAY), 0)
  assert.equal(dunningLevel(inv({ due_on: '2026-07-25' }), TODAY), 1)
  assert.equal(dunningLevel(inv({ due_on: '2026-07-19' }), TODAY), 2)
  assert.equal(dunningLevel(inv({ due_on: '2026-07-10' }), TODAY), 3)
  assert.equal(dunningLevel(inv({ due_on: '2026-05-01' }), TODAY), 4)
})

test('aging buckets match the receivables view', () => {
  assert.equal(agingBucket(inv({ due_on: '2026-08-01' }), TODAY), 'current')
  assert.equal(agingBucket(inv({ due_on: '2026-07-20' }), TODAY), '1–30')
  assert.equal(agingBucket(inv({ due_on: '2026-06-01' }), TODAY), '31–60')
  assert.equal(agingBucket(inv({ due_on: '2026-04-01' }), TODAY), '90+')
})

test('totals exclude void and draft invoices', () => {
  const invoices = [
    inv({ id: 'a', amount_cents: 100_000 }),
    inv({ id: 'b', amount_cents: 200_000, status: 'void' }),
    inv({ id: 'c', amount_cents: 300_000, status: 'draft' }),
  ]
  const s = summarise(invoices, [], TODAY)
  assert.equal(s.invoicedCents, 100_000)
})

test('overdue total counts only the unpaid remainder', () => {
  const invoices = [inv({ id: 'a', amount_cents: 400_000, due_on: '2026-07-01' })]
  const payments = [pay({ invoice_id: 'a', amount_cents: 150_000 })]
  const s = summarise(invoices, payments, TODAY)
  assert.equal(s.collectedCents, 150_000)
  assert.equal(s.outstandingCents, 250_000)
  assert.equal(s.overdueCents, 250_000)
})

test('an empty book summarises to zero rather than NaN', () => {
  assert.deepEqual(summarise([], [], TODAY), {
    invoicedCents: 0,
    collectedCents: 0,
    outstandingCents: 0,
    overdueCents: 0,
  })
})
