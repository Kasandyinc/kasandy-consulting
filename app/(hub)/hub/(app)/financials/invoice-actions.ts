'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import {
  invoiceBlockers,
  billingBlockers,
  requiresVerification,
  amountsFromSubtotal,
  dueOnFrom,
} from '@/lib/engine/invoice'
import {
  createSquareInvoice,
  fetchSquareInvoice,
  recordExternalPayment,
  squareConfigured,
} from '@/lib/square-invoices'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

const today = () => new Date().toISOString().slice(0, 10)

/**
 * Raise the draft invoice for a phase.
 *
 * Amounts come from the phase, never typed: the phase carries the figure that was
 * reconciled against the signed proposal, and a number re-entered by hand is a
 * number that can differ from the one the client agreed to.
 *
 * `requires_verification` is derived from the phase's billing_trigger for the same
 * reason — two places holding the same fact is how they come to disagree.
 *
 * Safe to call twice. The database holds a partial unique index on phase_id for
 * non-void invoices, so a second draft is refused rather than created; that matters
 * because the queue and a human can both reach this, and between a read and a write
 * either can fire.
 */
export async function draftInvoiceForPhase(args: { phaseId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { data: phase } = await supabase
    .from('engagement_phases')
    .select('id, name, amount_cents, billing_trigger, verified_at, send_on, engagement_id, brief_md')
    .eq('id', args.phaseId)
    .maybeSingle()

  if (!phase) return { ok: false, error: 'Phase not found.' }

  const blocked = billingBlockers(phase as never, today())
  if (blocked.length) return { ok: false, error: blocked.join(' · ') }

  const { data: engagement } = await supabase
    .from('engagements')
    .select('id, client_id')
    .eq('id', phase.engagement_id)
    .maybeSingle()

  if (!engagement) return { ok: false, error: 'That phase has no engagement.' }

  const existing = await supabase
    .from('invoices')
    .select('id, number, status')
    .eq('phase_id', phase.id)
    .neq('status', 'void')
    .maybeSingle()

  if (existing.data) {
    return {
      ok: false,
      error: `${existing.data.number} already bills this phase (${existing.data.status}).`,
    }
  }

  const amounts = amountsFromSubtotal(phase.amount_cents)
  const { data: numberRow } = await supabase.rpc('next_invoice_number')
  const number = (numberRow as unknown as string) ?? null
  if (!number) return { ok: false, error: 'Could not allocate an invoice number.' }

  const issued = today()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      client_id: engagement.client_id,
      engagement_id: engagement.id,
      phase_id: phase.id,
      number,
      description: phase.name,
      subtotal_cents: amounts.subtotalCents,
      tax_cents: amounts.taxCents,
      amount_cents: amounts.totalCents,
      requires_verification: requiresVerification(phase),
      status: 'draft',
      issued_on: issued,
      due_on: dueOnFrom(issued),
    })
    .select('id, number')
    .single()

  if (error) {
    // 23505 is the one-live-invoice-per-phase index doing its job.
    if (error.code === '23505') {
      return { ok: false, error: 'An invoice already bills this phase — nothing was created.' }
    }
    return { ok: false, error: error.message }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'invoice.drafted',
    entity: 'invoices',
    entity_id: invoice!.id,
    meta: {
      message: `${invoice!.number} drafted for "${phase.name}" — ready to send`,
      phase_id: phase.id,
      subtotal_cents: amounts.subtotalCents,
      tax_cents: amounts.taxCents,
      amount_cents: amounts.totalCents,
    },
  })

  revalidatePath('/financials')
  return { ok: true, id: invoice!.id, number: invoice!.number }
}

/**
 * Link a platform invoice to a Square invoice that already exists.
 *
 * The deposit for the first client was raised by hand in the Square dashboard while
 * this path was being built, so Square is the system that already holds it. Creating
 * a second one would put two invoices for the same $3,150 in front of a client who
 * submits receipts to a funder — so this reconciles to Square rather than competing
 * with it, and the totals must agree before it will link.
 */
export async function importSquareInvoice(args: { invoiceId: string; squareInvoiceId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const configured = squareConfigured()
  if (!configured.ok) return { ok: false, error: configured.reason! }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, number, amount_cents, square_invoice_id, status')
    .eq('id', args.invoiceId)
    .maybeSingle()

  if (!invoice) return { ok: false, error: 'Invoice not found.' }
  if (invoice.square_invoice_id) {
    return {
      ok: false,
      error: `${invoice.number} is already linked to Square invoice ${invoice.square_invoice_id}.`,
    }
  }

  const square = await fetchSquareInvoice(args.squareInvoiceId.trim())
  if (!square.ok) return { ok: false, error: square.error }

  // The totals must agree. A link between two invoices for different amounts is
  // worse than no link: it reads as reconciled while the client has been asked for
  // a different number than the platform believes she owes.
  if (square.value.totalCents !== null && square.value.totalCents !== invoice.amount_cents) {
    const cad = (c: number) => `$${(c / 100).toFixed(2)}`
    return {
      ok: false,
      error: `Square's invoice is ${cad(square.value.totalCents)} but ${invoice.number} is ${cad(invoice.amount_cents)}. Fix one before linking them.`,
    }
  }

  const { error } = await supabase
    .from('invoices')
    .update({
      square_invoice_id: square.value.id,
      square_payment_url: square.value.paymentUrl,
      square_version: square.value.version,
      // Square already holds it and the client has it, so it is not a draft here.
      status: invoice.status === 'draft' ? 'issued' : invoice.status,
    })
    .eq('id', invoice.id)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'That Square invoice is already linked to another invoice here.' }
    }
    return { ok: false, error: error.message }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'invoice.square_linked',
    entity: 'invoices',
    entity_id: invoice.id,
    meta: {
      message: `${invoice.number} linked to the Square invoice it was raised as`,
      square_invoice_id: square.value.id,
      square_status: square.value.status,
      imported: true,
    },
  })

  revalidatePath('/financials')
  return { ok: true, squareStatus: square.value.status, paymentUrl: square.value.paymentUrl }
}

/**
 * Issue a draft: check it is a lawful tax invoice, create it in Square, publish it.
 *
 * The gate runs before Square is touched. An invoice with no GST breakdown or no
 * registration number is not valid for the client's ITC or PSB rebate, and one that
 * reached Square would be one the client has already been asked to pay.
 */
export async function issueInvoice(args: { invoiceId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const [{ data: invoice }, { data: settings }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, clients(id, orgs(name)), engagement_phases(name, billing_trigger, verified_at, send_on)')
      .eq('id', args.invoiceId)
      .maybeSingle(),
    supabase.from('settings').select('gst_number, square_location_id').maybeSingle(),
  ])

  if (!invoice) return { ok: false, error: 'Invoice not found.' }
  if (invoice.square_invoice_id) {
    return { ok: false, error: 'This invoice is already in Square — nothing to issue.' }
  }

  const gstNumber = (settings as { gst_number: string | null } | null)?.gst_number ?? null
  const blockers = invoiceBlockers(invoice as never, { gstNumber })

  const phase = invoice.engagement_phases as
    | { name: string; billing_trigger: string; verified_at: string | null; send_on: string | null }
    | null
  if (phase) blockers.push(...billingBlockers(phase, today()))

  if (blockers.length) return { ok: false, error: blockers.join(' · '), blockers }

  const configured = squareConfigured()
  if (!configured.ok) return { ok: false, error: configured.reason! }

  const locationId =
    (settings as { square_location_id: string | null } | null)?.square_location_id ||
    process.env.SQUARE_LOCATION_ID
  if (!locationId) return { ok: false, error: 'No Square location configured.' }

  // Who the invoice is for. Read for the Square record rather than decided here.
  const { data: contact } = await supabase
    .from('client_users')
    .select('name, email')
    .eq('client_id', invoice.client_id)
    .limit(1)
    .maybeSingle()

  const square = await createSquareInvoice({
    number: invoice.number,
    description: invoice.description ?? invoice.number,
    subtotalCents: invoice.subtotal_cents,
    taxCents: invoice.tax_cents,
    totalCents: invoice.amount_cents,
    dueOn: invoice.due_on ?? dueOnFrom(today()),
    clientName: contact?.name ?? '',
    clientEmail: contact?.email ?? '',
    locationId,
  })

  if (!square.ok) {
    // Deliberately leaves the invoice a draft. A row marked issued with no payment
    // link is an invoice the client cannot pay and nobody is told about.
    await supabase.from('audit_log').insert({
      actor: email,
      action: 'invoice.issue_failed',
      entity: 'invoices',
      entity_id: invoice.id,
      meta: { message: `${invoice.number} could not be created in Square`, error: square.error },
    })
    return { ok: false, error: `Square refused it: ${square.error}` }
  }

  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'issued',
      square_invoice_id: square.value.id,
      square_payment_url: square.value.paymentUrl,
      square_version: square.value.version,
      issued_on: invoice.issued_on ?? today(),
    })
    .eq('id', invoice.id)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'invoice.issued',
    entity: 'invoices',
    entity_id: invoice.id,
    meta: {
      message: `${invoice.number} issued — ${(invoice.amount_cents / 100).toFixed(2)} CAD`,
      square_invoice_id: square.value.id,
      amount_cents: invoice.amount_cents,
    },
  })

  revalidatePath('/financials')
  return { ok: true, paymentUrl: square.value.paymentUrl }
}

/**
 * Record a payment that arrived outside Square, and tell Square about it.
 *
 * The second half is the point. If e-Transfers only ever land here, Square shows a
 * permanently unpaid invoice and the qbo_sync reconciliation never balances —
 * discovered at year end, when the evidence is months old. Either side may be where
 * a payment is recorded; both have to end up agreeing.
 *
 * The push is best-effort and its failure is recorded rather than swallowed:
 * `pushed_to_square` false is a reconciliation that has not completed, and is meant
 * to stay visible until it has.
 */
export async function markInvoicePaid(args: {
  invoiceId: string
  amount: string
  receivedOn: string
  method: 'e_transfer' | 'eft' | 'cheque' | 'other'
  reference: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const cleaned = String(args.amount).replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return { ok: false, error: 'Enter an amount like 3150 or 3150.00.' }
  }
  const cents = Math.round(Number(cleaned) * 100)
  if (cents <= 0) return { ok: false, error: 'The amount has to be more than zero.' }
  if (!args.receivedOn) return { ok: false, error: 'When was it received?' }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, number, amount_cents, status, square_invoice_id')
    .eq('id', args.invoiceId)
    .maybeSingle()

  if (!invoice) return { ok: false, error: 'Invoice not found.' }
  if (invoice.status === 'void') return { ok: false, error: 'That invoice is void.' }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoice.id,
      amount_cents: cents,
      currency: 'CAD',
      method: args.method,
      received_on: args.receivedOn,
      reference: args.reference.trim() || null,
      recorded_by: email,
      // Only meaningful when there is a Square invoice to push it to.
      pushed_to_square: invoice.square_invoice_id ? false : null,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  // Partial or full, decided by what the invoice has actually received rather than
  // by this one payment — two part payments must land on `paid`, not `partially_paid`.
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount_cents')
    .eq('invoice_id', invoice.id)

  const paid = (allPayments ?? []).reduce((s, p) => s + (p.amount_cents as number), 0)
  const status = paid >= invoice.amount_cents ? 'paid' : 'partially_paid'

  await supabase
    .from('invoices')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', invoice.id)

  // ── The other half: tell Square ───────────────────────────────────────────
  let pushWarning: string | null = null
  if (invoice.square_invoice_id && squareConfigured().ok) {
    const pushed = await recordExternalPayment({
      squareInvoiceId: invoice.square_invoice_id,
      amountCents: cents,
      note: `${args.method} · ${invoice.number}${args.reference.trim() ? ` · ${args.reference.trim()}` : ''}`,
      receivedOn: args.receivedOn,
      paymentId: payment!.id,
    })

    if (pushed.ok) {
      await supabase
        .from('payments')
        .update({ pushed_to_square: true, square_payment_id: pushed.value.paymentId })
        .eq('id', payment!.id)
    } else {
      pushWarning = pushed.error
    }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'payment.recorded',
    entity: 'invoices',
    entity_id: invoice.id,
    meta: {
      message: `${(cents / 100).toFixed(2)} CAD recorded against ${invoice.number} by ${args.method}`,
      amount_cents: cents,
      method: args.method,
      received_on: args.receivedOn,
      reference: args.reference.trim() || null,
      invoice_status: status,
      pushed_to_square: invoice.square_invoice_id ? pushWarning === null : null,
      push_error: pushWarning,
    },
  })

  revalidatePath('/financials')
  return {
    ok: true,
    status,
    ...(pushWarning
      ? {
          warning: `Recorded here, but Square was not updated: ${pushWarning}. Square will show this invoice unpaid until that is fixed.`,
        }
      : {}),
  }
}
