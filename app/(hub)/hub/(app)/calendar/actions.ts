'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import type { BookingStatus } from '@/lib/engine/delivery'

const STATUSES: BookingStatus[] = ['requested', 'confirmed', 'held', 'done', 'no_show', 'cancelled']

/** Move a booking along. Cancelling releases the slot for someone else to take. */
export async function setBookingStatus(args: {
  bookingId: string
  status: BookingStatus
  reason?: string
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }
  if (!STATUSES.includes(args.status)) return { ok: false, error: 'Unknown status.' }

  const { error } = await supabase
    .from('bookings')
    .update({
      status: args.status,
      ...(args.status === 'cancelled' ? { cancelled_reason: args.reason?.trim() || null } : {}),
    })
    .eq('id', args.bookingId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'booking.status_changed',
    entity: 'bookings',
    entity_id: args.bookingId,
    meta: { to: args.status, reason: args.reason ?? null },
  })

  revalidatePath('/calendar')
  return { ok: true }
}

/**
 * Turn a held call into an intake.
 *
 * A discovery call without a follow-up questionnaire is where the thread goes cold,
 * so this exists as one action rather than three screens. The intake is created
 * against the org, linked to the booking, and carries its own token for the client
 * to open without an account.
 */
export async function startIntakeFromBooking(bookingId: string) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, org_id, name, email')
    .eq('id', bookingId)
    .maybeSingle()

  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (!booking.org_id) {
    return {
      ok: false,
      error: 'This booking is not linked to an organisation yet — link it first, so the intake has somewhere to live.',
    }
  }

  const { data: existing } = await supabase
    .from('intakes')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (existing) return { ok: false, error: 'An intake already exists for this call.' }

  const { data: form } = await supabase
    .from('intake_forms')
    .select('id')
    .eq('slug', 'discovery-intake')
    .maybeSingle()

  const { data: intake, error } = await supabase
    .from('intakes')
    .insert({
      org_id: booking.org_id,
      booking_id: bookingId,
      form_id: form?.id ?? null,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select('id, token')
    .single()

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'intake.created',
    entity: 'intakes',
    entity_id: intake!.id,
    meta: { booking_id: bookingId, org_id: booking.org_id },
  })

  revalidatePath('/calendar')
  revalidatePath(`/outreach/${booking.org_id}`)
  return { ok: true, token: intake!.token }
}
