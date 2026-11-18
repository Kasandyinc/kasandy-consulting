import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isInvoiceEvent, parseInvoiceEvent, applyInvoiceEvent } from './square-invoice-webhook.ts'

/**
 * A fake database, just enough to exercise the decisions.
 *
 * The branches that matter most here are the ones that do nothing — a retried
 * delivery, an invoice Square holds that this platform does not — and those are
 * exactly the branches a live integration almost never reaches on demand.
 */
function fakeDb(opts: {
  invoice?: Record<string, unknown> | null
  insertError?: { code?: string; message: string } | null
}) {
  const calls: { table: string; op: string; row?: Record<string, unknown> }[] = []
  const db = {
    from(table: string) {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              calls.push({ table, op: 'select' })
              return { data: opts.invoice ?? null }
            },
          }),
        }),
        insert: async (row: Record<string, unknown>) => {
          calls.push({ table, op: 'insert', row })
          return { error: opts.insertError ?? null }
        },
        update: (row: Record<string, unknown>) => ({
          eq: async () => {
            calls.push({ table, op: 'update', row })
            return { error: null }
          },
        }),
      }
    },
  }
  return { db, calls }
}

const invoiceEvent = (over: Record<string, unknown> = {}) => ({
  type: 'invoice.payment_made',
  data: {
    object: {
      invoice: {
        id: 'sq-inv-1',
        status: 'PAID',
        payment_requests: [
          {
            computed_amount_money: { amount: 315000 },
            total_completed_amount_money: { amount: 315000 },
            card_payment_ids: ['sq-pay-1'],
          },
        ],
        ...over,
      },
    },
  },
})

// ─── Which events are ours ──────────────────────────────────────────────────

test('only invoice events are claimed', () => {
  assert.ok(isInvoiceEvent('invoice.payment_made'))
  assert.ok(isInvoiceEvent('invoice.canceled'))
  // The product checkout uses the same Square account. Claiming its events would
  // break the download path.
  assert.ok(!isInvoiceEvent('payment.updated'))
  assert.ok(!isInvoiceEvent('order.created'))
})

// ─── Parsing a payload from outside the system ──────────────────────────────

test('a well-formed event yields the fields that matter', () => {
  const parsed = parseInvoiceEvent(invoiceEvent())
  assert.ok(parsed)
  assert.equal(parsed!.invoiceId, 'sq-inv-1')
  assert.equal(parsed!.paidCents, 315000)
  assert.equal(parsed!.paymentId, 'sq-pay-1')
})

test('a malformed payload yields null rather than throwing', () => {
  // Square retries a failed delivery for hours. A shape we do not recognise has to
  // be "nothing to do", not an exception.
  for (const bad of [null, undefined, {}, { type: 'invoice.updated' }, { type: 'invoice.updated', data: {} }]) {
    assert.equal(parseInvoiceEvent(bad), null)
  }
})

test('partial payment is read as what has actually settled', () => {
  const parsed = parseInvoiceEvent(
    invoiceEvent({
      payment_requests: [
        {
          computed_amount_money: { amount: 315000 },
          total_completed_amount_money: { amount: 100000 },
          card_payment_ids: ['sq-pay-partial'],
        },
      ],
    }),
  )
  assert.equal(parsed!.paidCents, 100000)
})

// ─── Applying it ────────────────────────────────────────────────────────────

const INVOICE = { id: 'inv-1', number: 'INV-0001', amount_cents: 315000, status: 'issued' }

test('a full payment records the payment and marks the invoice paid', async () => {
  const { db, calls } = fakeDb({ invoice: INVOICE })
  const out = await applyInvoiceEvent(parseInvoiceEvent(invoiceEvent())!, db as never)

  assert.deepEqual(out, { handled: true, action: 'recorded', invoiceNumber: 'INV-0001' })

  const payment = calls.find((c) => c.table === 'payments' && c.op === 'insert')
  assert.ok(payment, 'no payment row was written')
  assert.equal(payment!.row!.amount_cents, 315000)
  // Square is the processor, not the method.
  assert.equal(payment!.row!.method, 'card')
  // Null, not false: it came from Square, so there is nothing to push back to it.
  assert.equal(payment!.row!.pushed_to_square, null)

  const update = calls.find((c) => c.table === 'invoices' && c.op === 'update')
  assert.equal(update!.row!.status, 'paid')
  assert.ok(update!.row!.paid_at)
})

test('a retried delivery is a no-op, not a second payment', async () => {
  // The unique index on square_payment_id is the real guarantee; this is the code
  // treating its own guarantee as success rather than an error, because a handler
  // that 500s on a duplicate gets retried harder.
  const { db } = fakeDb({ invoice: INVOICE, insertError: { code: '23505', message: 'duplicate key' } })
  const out = await applyInvoiceEvent(parseInvoiceEvent(invoiceEvent())!, db as never)
  assert.deepEqual(out, { handled: true, action: 'already_recorded', invoiceNumber: 'INV-0001' })
})

test('a partial payment does not mark the invoice paid', async () => {
  const { db, calls } = fakeDb({ invoice: INVOICE })
  const event = invoiceEvent({
    payment_requests: [
      {
        computed_amount_money: { amount: 315000 },
        total_completed_amount_money: { amount: 100000 },
        card_payment_ids: ['sq-pay-partial'],
      },
    ],
  })
  await applyInvoiceEvent(parseInvoiceEvent(event)!, db as never)

  const update = calls.find((c) => c.table === 'invoices' && c.op === 'update')
  assert.equal(update!.row!.status, 'partially_paid')
  assert.equal(update!.row!.paid_at, null)
})

test('an invoice Square holds but the platform does not is declined, not failed', async () => {
  // The same Square account takes product sales. A delivery we cannot match is
  // nothing to retry.
  const { db, calls } = fakeDb({ invoice: null })
  const out = await applyInvoiceEvent(parseInvoiceEvent(invoiceEvent())!, db as never)

  assert.equal(out.handled, false)
  assert.ok(!calls.some((c) => c.table === 'payments'), 'wrote a payment for an unknown invoice')
})

test('a cancellation voids the invoice and books no payment', async () => {
  const { db, calls } = fakeDb({ invoice: INVOICE })
  const event = { ...invoiceEvent(), type: 'invoice.canceled' }
  const out = await applyInvoiceEvent(parseInvoiceEvent(event)!, db as never)

  assert.equal(out.handled, true)
  const update = calls.find((c) => c.table === 'invoices' && c.op === 'update')
  assert.equal(update!.row!.status, 'void')
  assert.ok(!calls.some((c) => c.table === 'payments'), 'a cancellation recorded a payment')
})

test('an event with nothing settled moves no money', async () => {
  const { db, calls } = fakeDb({ invoice: INVOICE })
  const event = invoiceEvent({
    payment_requests: [{ computed_amount_money: { amount: 315000 }, total_completed_amount_money: { amount: 0 } }],
  })
  const out = await applyInvoiceEvent(parseInvoiceEvent(event)!, db as never)

  assert.equal(out.handled, true)
  assert.equal(out.handled && out.action, 'status_only')
  assert.ok(!calls.some((c) => c.table === 'payments'), 'booked a payment for zero')
})
