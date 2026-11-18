import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { shouldDraftToday, amountsFromSubtotal, requiresVerification, dueOnFrom } from '@/lib/engine/invoice'

/**
 * Queue tomorrow's invoices as drafts, one day ahead. Jackee presses send.
 *
 * It drafts and it alerts. It does not send, and it does not create anything in
 * Square — issuing is a deliberate act, consistent with the house rule that nothing
 * auto-fires until it has been watched working several times. Invoices 3 and 4 on
 * the first engagement are triggered by delivery of a session rather than by a date,
 * and only a person knows whether the session actually happened.
 *
 * A phase with no `send_on` is skipped, never guessed. The December workshop has no
 * confirmed date; inventing one would invoice a client for a session nobody has
 * booked.
 */
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: phases, error } = await supabase
    .from('engagement_phases')
    .select('id, name, amount_cents, billing_trigger, verified_at, send_on, engagement_id')
    .not('send_on', 'is', null)

  if (error) {
    console.error('[cron/invoices] could not read phases:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const drafted: string[] = []
  const skipped: { phase: string; why: string }[] = []

  for (const phase of phases ?? []) {
    if (!shouldDraftToday(phase as { send_on: string | null }, today)) {
      skipped.push({ phase: phase.name as string, why: 'not due yet' })
      continue
    }

    // A milestone phase that has not been verified is not ready to bill, whatever
    // its date says. The date is when we would LIKE to invoice; verification is what
    // entitles us to.
    if (requiresVerification(phase as { billing_trigger: string }) && !phase.verified_at) {
      skipped.push({ phase: phase.name as string, why: 'bills on verification, not verified yet' })
      continue
    }

    const { data: existing } = await supabase
      .from('invoices')
      .select('id, number')
      .eq('phase_id', phase.id)
      .neq('status', 'void')
      .maybeSingle()

    if (existing) {
      skipped.push({ phase: phase.name as string, why: `${existing.number} already bills it` })
      continue
    }

    const { data: engagement } = await supabase
      .from('engagements')
      .select('id, client_id')
      .eq('id', phase.engagement_id)
      .maybeSingle()

    if (!engagement) {
      skipped.push({ phase: phase.name as string, why: 'no engagement' })
      continue
    }

    const amounts = amountsFromSubtotal(phase.amount_cents as number)
    const { data: number } = await supabase.rpc('next_invoice_number')

    const { data: invoice, error: insertError } = await supabase
      .from('invoices')
      .insert({
        client_id: engagement.client_id,
        engagement_id: engagement.id,
        phase_id: phase.id,
        number: number as unknown as string,
        description: phase.name,
        subtotal_cents: amounts.subtotalCents,
        tax_cents: amounts.taxCents,
        amount_cents: amounts.totalCents,
        requires_verification: requiresVerification(phase as { billing_trigger: string }),
        status: 'draft',
        issued_on: today,
        due_on: dueOnFrom(today),
      })
      .select('id, number')
      .single()

    if (insertError) {
      // 23505 is the one-invoice-per-phase index. Between the read above and this
      // write, a person can have raised it by hand — which is the index doing
      // exactly what it is for, not an error worth alarming anyone about.
      skipped.push({
        phase: phase.name as string,
        why: insertError.code === '23505' ? 'raised by someone else first' : insertError.message,
      })
      continue
    }

    drafted.push(invoice!.number as string)

    await supabase.from('audit_log').insert({
      actor: 'cron',
      action: 'invoice.drafted',
      entity: 'invoices',
      entity_id: invoice!.id,
      meta: {
        message: `${invoice!.number} is ready to send for "${phase.name}" — ${(amounts.totalCents / 100).toFixed(2)} CAD`,
        phase_id: phase.id,
        send_on: phase.send_on,
        queued_a_day_ahead: true,
      },
    })
  }

  return NextResponse.json({ ok: true, today, drafted, skipped })
}
