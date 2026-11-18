'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'

/**
 * Money actions. Everything here writes through the database's own rules — the
 * Square location lock and the verification gate are triggers, so a wrong value is
 * refused rather than validated away in the UI first.
 */

/** Cents from a typed amount like "5,000" or "5000.50". Rejects anything else. */
function toCents(input: string): number | null {
  const cleaned = String(input).replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  return Math.round(Number(cleaned) * 100)
}

export async function createInvoice(form: {
  clientId: string
  number: string
  description: string
  amount: string
  dueOn: string
  requiresVerification: boolean
  engagementId?: string
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const cents = toCents(form.amount)
  if (cents === null || cents <= 0) {
    return { ok: false, error: 'Enter an amount like 5000 or 5000.50.' }
  }
  if (!form.number.trim()) return { ok: false, error: 'An invoice number is required.' }

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      client_id: form.clientId,
      engagement_id: form.engagementId || null,
      number: form.number.trim(),
      description: form.description.trim() || null,
      amount_cents: cents,
      due_on: form.dueOn || null,
      requires_verification: form.requiresVerification,
      status: 'draft',
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'invoice.created',
    entity: 'invoices',
    entity_id: data!.id,
    meta: { number: form.number, amount_cents: cents, requires_verification: form.requiresVerification },
  })

  revalidatePath('/financials')
  return { ok: true }
}

/**
 * Issue a draft invoice. For a milestone invoice the database refuses this until the
 * client has marked the phase verified, so the refusal surfaces here verbatim.
 */
/**
 * Issuing lives in ./invoice-actions.ts now.
 *
 * What stood here flipped status to 'issued' and stopped. It created nothing in
 * Square, so an "issued" invoice had no way to be paid, and it checked nothing about
 * the document — a gross figure with no GST breakdown and no registration number
 * would have gone out, which is not valid for the client's ITC or PSB rebate. It
 * leaned entirely on the database trigger to refuse what it should not have offered.
 *
 * Deleted rather than kept alongside: two exported functions called issueInvoice,
 * doing different things, is how a screen ends up calling the one that does less.
 */


export async function recordPayment(form: {
  invoiceId: string
  amount: string
  method: 'e_transfer' | 'cheque' | 'other'
  receivedOn: string
  reference: string
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const cents = toCents(form.amount)
  if (cents === null || cents <= 0) {
    return { ok: false, error: 'Enter an amount like 2500 or 2500.75.' }
  }

  const { error } = await supabase.from('payments').insert({
    invoice_id: form.invoiceId,
    amount_cents: cents,
    method: form.method,
    received_on: form.receivedOn || new Date().toISOString().slice(0, 10),
    reference: form.reference.trim() || null,
    recorded_by: user!.email,
  })

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'payment.recorded',
    entity: 'invoices',
    entity_id: form.invoiceId,
    meta: { amount_cents: cents, method: form.method, reference: form.reference || null },
  })

  revalidatePath('/financials')
  return { ok: true }
}
