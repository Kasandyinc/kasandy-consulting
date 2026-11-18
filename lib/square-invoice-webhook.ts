/**
 * Square invoice events → payments in the platform.
 *
 * The existing webhook handler covers product sales: a `payment.updated` for a
 * download, resolved to a product slug. An invoice payment is a different event and
 * a different record — it belongs to an invoice, a client and an engagement, none of
 * which a download token knows about — so it is handled here rather than bolted onto
 * that branch.
 *
 * Idempotency is not optional. Square retries deliveries and its documentation is
 * explicit that handlers must tolerate the same event arriving more than once. The
 * unique index on payments.square_payment_id is the real guarantee; this code is
 * written so the retry is a no-op rather than an error, because a handler that
 * returns 500 on a duplicate gets retried harder.
 */

/** The parts of a Square invoice event this cares about. */
export type SquareInvoiceEvent = {
  type: string
  invoiceId: string | null
  /** Cents Square has actually collected against the invoice so far. */
  paidCents: number
  /** Square's id for the payment, when the event carries one. */
  paymentId: string | null
  status: string | null
}

const INVOICE_EVENTS = new Set([
  'invoice.payment_made',
  'invoice.updated',
  'invoice.canceled',
])

/** True when this event is about an invoice rather than a product sale. */
export function isInvoiceEvent(type: string): boolean {
  return INVOICE_EVENTS.has(type)
}

/**
 * Pull the few fields that matter out of Square's envelope.
 *
 * Written defensively on purpose: this parses a payload from outside the system, and
 * a shape that does not match should produce "nothing to do" rather than an
 * exception that Square reads as a failed delivery and retries for hours.
 */
export function parseInvoiceEvent(event: unknown): SquareInvoiceEvent | null {
  const e = event as {
    type?: string
    data?: { object?: { invoice?: Record<string, unknown> } }
  }
  if (!e?.type || !isInvoiceEvent(e.type)) return null

  const invoice = e.data?.object?.invoice
  if (!invoice) return null

  const requests = invoice.payment_requests as
    | { total_completed_amount_money?: { amount?: number }; computed_amount_money?: { amount?: number } }[]
    | undefined

  const paidCents = (requests ?? []).reduce(
    (sum, r) => sum + Number(r.total_completed_amount_money?.amount ?? 0),
    0,
  )

  // Square lists the payments that have settled against the invoice. The last is the
  // one this event is about, and it is what makes a retried delivery recognisable.
  const settled = (invoice as { payment_requests?: { card_payment_ids?: string[] }[] }).payment_requests
  const cardIds = (settled ?? []).flatMap((r) => r.card_payment_ids ?? [])

  return {
    type: e.type,
    invoiceId: (invoice.id as string | undefined) ?? null,
    paidCents,
    paymentId: cardIds.length ? cardIds[cardIds.length - 1] : null,
    status: (invoice.status as string | undefined) ?? null,
  }
}

export type WebhookOutcome =
  | { handled: false; why: string }
  | { handled: true; action: 'recorded' | 'already_recorded' | 'status_only'; invoiceNumber: string }

type MinimalClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>
        eq?: unknown
      }
    }
    insert: (row: Record<string, unknown>) => Promise<{ error: { code?: string; message: string } | null }>
    update: (row: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: { message: string } | null }>
    }
  }
}

/**
 * Apply an invoice event: record the payment, move the invoice's status.
 *
 * Takes the database client as an argument so the decision logic can be exercised
 * without a database — the branch that matters most here is the one that does
 * nothing, and that is the hardest branch to reach through a live integration.
 */
export async function applyInvoiceEvent(
  parsed: SquareInvoiceEvent,
  db: MinimalClient,
): Promise<WebhookOutcome> {
  if (!parsed.invoiceId) return { handled: false, why: 'event carried no invoice id' }

  const { data: invoice } = await db
    .from('invoices')
    .select('id, number, amount_cents, status')
    .eq('square_invoice_id', parsed.invoiceId)
    .maybeSingle()

  if (!invoice) {
    // Square holds invoices this platform does not: the product checkout uses the
    // same account. Not an error, and not something to retry.
    return { handled: false, why: `no platform invoice linked to ${parsed.invoiceId}` }
  }

  const number = invoice.number as string

  if (parsed.type === 'invoice.canceled') {
    await db.from('invoices').update({ status: 'void' }).eq('id', invoice.id)
    return { handled: true, action: 'status_only', invoiceNumber: number }
  }

  if (parsed.paidCents <= 0) {
    return { handled: true, action: 'status_only', invoiceNumber: number }
  }

  // The payment row. `square_payment_id` is uniquely indexed, so a retried delivery
  // collides here rather than booking the client as having paid twice.
  if (parsed.paymentId) {
    const { error } = await db.from('payments').insert({
      invoice_id: invoice.id,
      amount_cents: parsed.paidCents,
      currency: 'CAD',
      // 'card' rather than 'square': Square is the processor, not the method.
      method: 'card',
      received_on: new Date().toISOString().slice(0, 10),
      square_payment_id: parsed.paymentId,
      recorded_by: 'square-webhook',
      // Null, not false: this payment originated in Square, so there is nothing to
      // push back to it.
      pushed_to_square: null,
    })

    if (error?.code === '23505') {
      return { handled: true, action: 'already_recorded', invoiceNumber: number }
    }
    if (error) return { handled: false, why: error.message }
  }

  const fullyPaid = parsed.paidCents >= (invoice.amount_cents as number)
  await db
    .from('invoices')
    .update({
      status: fullyPaid ? 'paid' : 'partially_paid',
      paid_at: fullyPaid ? new Date().toISOString() : null,
    })
    .eq('id', invoice.id)

  return { handled: true, action: 'recorded', invoiceNumber: number }
}
