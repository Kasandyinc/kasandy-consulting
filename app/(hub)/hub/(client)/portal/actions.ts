'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Mark a phase verified live.
 *
 * This runs on the *client's own session* — deliberately not the admin client. The
 * database trigger checks that whoever is writing is a client user of the client that
 * owns the engagement, and refuses operators and strangers alike. Using a service key
 * here would bypass the very rule this action exists to honour.
 */
export async function verifyPhase(args: { phaseId: string; note: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Please sign in again.' }

  const { data, error } = await supabase
    .from('engagement_phases')
    .update({
      verified_at: new Date().toISOString(),
      verify_note: args.note.trim() || null,
    })
    .eq('id', args.phaseId)
    .select('id, name, engagement_id')

  // The trigger's messages are written to be read by the client, so pass them through.
  if (error) return { ok: false, error: error.message }

  // RLS filtered the row out rather than raising: this phase is not theirs.
  if (!data?.length) {
    return { ok: false, error: 'That phase is not part of your engagement.' }
  }

  // §7.5 — this is the event that releases an invoice, so it must be on the record.
  // It used to fail silently: audit_log's only INSERT policy was operator-only, and
  // nothing checked the error. Migration 12 grants clients an append-only path; if
  // it is ever refused again, the verification still stands but the operator is told
  // rather than the gap going unnoticed.
  const { error: auditError } = await supabase.from('audit_log').insert({
    actor: user.email,
    action: 'phase.verified',
    entity: 'engagement_phases',
    entity_id: args.phaseId,
    meta: { name: data[0].name, note: args.note.trim() || null },
  })

  revalidatePath('/portal')
  if (auditError) {
    return {
      ok: true,
      warning: `Recorded, but the activity log entry failed: ${auditError.message}`,
    }
  }
  return { ok: true }
}

/**
 * Accept an invoice: "I agree to pay this."
 *
 * Deliberately not the same act as verifying a phase, and deliberately available
 * before the work happens.
 *
 * The client asked to be invoiced ahead of the Foundations Workshop, which is
 * ordinary — payment reserves the date. Under the old model the only way to issue
 * that invoice was to have her mark the phase verified, eight days before the
 * workshop. That is not a shortcut, it is a false record: a verification says a
 * thing was delivered, and one signed early makes every other verification in the
 * file worth less — including the ones a funder may read.
 *
 * So there are two statements now. This one is about the money and can come first.
 * `verifyPhase` is about the delivery and always comes after it.
 *
 * Runs on the client's own session, like verifyPhase: RLS decides whether this
 * invoice is theirs. A service key here would bypass the rule this exists to honour.
 */
export async function acceptInvoice(args: { invoiceId: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ok: false, error: 'Please sign in again.' }

  // Only an invoice that has actually been issued can be accepted. A draft is not
  // yet a document anybody has been shown, and accepting one would record agreement
  // to a figure that can still change.
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, number, status, amount_cents, accepted_at')
    .eq('id', args.invoiceId)
    .maybeSingle()

  if (!invoice) return { ok: false, error: 'That invoice is not one of yours.' }
  if (invoice.status === 'draft') {
    return { ok: false, error: 'That invoice has not been issued yet.' }
  }
  if (invoice.status === 'void') {
    return { ok: false, error: 'That invoice has been cancelled.' }
  }
  if (invoice.accepted_at) {
    return { ok: false, error: 'You have already accepted this invoice.' }
  }

  const { data, error } = await supabase
    .from('invoices')
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.email })
    .eq('id', args.invoiceId)
    .is('accepted_at', null)
    .select('id, number')

  if (error) return { ok: false, error: error.message }
  if (!data?.length) {
    // Either RLS filtered it out, or another tab accepted it between the read above
    // and this write. Both are "nothing to do here" rather than an error worth
    // alarming a client with.
    return { ok: false, error: 'That invoice is not one of yours, or was just accepted.' }
  }

  const { error: auditError } = await supabase.from('audit_log').insert({
    actor: user.email,
    action: 'invoice.accepted',
    entity: 'invoices',
    entity_id: args.invoiceId,
    meta: { number: invoice.number, amount_cents: invoice.amount_cents },
  })

  revalidatePath('/portal')
  if (auditError) {
    return {
      ok: true,
      warning: `Recorded, but the activity log entry failed: ${auditError.message}`,
    }
  }
  return { ok: true }
}
