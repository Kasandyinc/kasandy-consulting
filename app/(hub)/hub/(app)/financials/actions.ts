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
export async function issueInvoice(invoiceId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'issued', issued_on: new Date().toISOString().slice(0, 10) })
    .eq('id', invoiceId)

  if (error) {
    await supabase.from('audit_log').insert({
      actor: user!.email,
      action: 'invoice.refused',
      entity: 'invoices',
      entity_id: invoiceId,
      meta: { reason: error.message },
    })
    return { ok: false, error: error.message }
  }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'invoice.issued',
    entity: 'invoices',
    entity_id: invoiceId,
  })

  revalidatePath('/financials')
  return { ok: true }
}

/**
 * Record a payment that did not come through Square — an e-transfer or a cheque.
 * These reconcile against QuickBooks the same way card payments do, which is why
 * they live in the same ledger rather than a side list.
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
