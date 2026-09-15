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
 * Write down what happened in the call.
 *
 * Kept out of `notes`, which holds where the booking came from. One column cannot
 * hold both a fact about the client and a fact about our own plumbing without one
 * of them eventually overwriting the other.
 */
export async function saveMeetingNotes(args: { bookingId: string; notes: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('bookings')
    .update({ meeting_notes: args.notes.trim() || null })
    .eq('id', args.bookingId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/calendar')
  return { ok: true }
}

/** Override the room for one call. Blank falls back to the standing link in Settings. */
export async function setBookingMeetingLink(args: { bookingId: string; link: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const link = args.link.trim()
  if (link && !/^https:\/\/\S+$/i.test(link)) {
    return { ok: false, error: 'A meeting link has to be an https:// URL.' }
  }

  const { error } = await supabase
    .from('bookings')
    .update({ meeting_link: link || null })
    .eq('id', args.bookingId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/calendar')
  return { ok: true }
}

/**
 * Attach a booking to an organisation — the weld that was missing.
 *
 * A website booking arrives with org_id null, because a stranger filling in a form is
 * not yet an organisation in the pipeline. Everything downstream of the call needs
 * one: the intake, the discovery, the proposal, and so the client the signature
 * creates. Without this the call happens and the platform stops there.
 *
 * `orgId` links to an organisation that already exists. Otherwise one is created from
 * what the booking itself claims, at stage 0_unverified with a note saying so — the
 * same provenance rule the contact form follows, because a name typed into a booking
 * form is a claim, not research. No leader, no segment, no fit assessment is invented.
 */
export async function linkBookingToOrg(args: { bookingId: string; orgId?: string }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, org_id, name, email, organisation')
    .eq('id', args.bookingId)
    .maybeSingle()

  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (booking.org_id) return { ok: false, error: 'This booking is already linked.' }

  let orgId = args.orgId
  // Whether this booking is what brought the organisation into existence. It decides
  // whether a consent basis may be recorded below — see the note there.
  let orgIsNew = false

  if (!orgId) {
    const claimed = booking.organisation?.trim()
    if (!claimed) {
      return {
        ok: false,
        error: 'This booking names no organisation, so there is nothing to create. Pick an existing one instead.',
      }
    }

    // Match before creating: a second row for an organisation already in the
    // pipeline would split its history across two records.
    const { data: existing } = await supabase
      .from('orgs')
      .select('id')
      .ilike('name', claimed)
      .maybeSingle()

    if (existing) {
      orgId = existing.id
    } else {
      const { data: created, error } = await supabase
        .from('orgs')
        .insert({
          name: claimed,
          stage: '0_unverified',
          notes: 'Created from a booking taken on the website — nothing here is verified.',
        })
        .select('id')
        .single()

      if (error) return { ok: false, error: error.message }
      orgId = created.id
      orgIsNew = true
    }
  }

  // The person who booked becomes a contact on that organisation, claimed rather
  // than verified: they typed the address in, nobody has round-tripped it.
  const address = booking.email.trim().toLowerCase()
  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('org_id', orgId)
    .ilike('email', address)
    .maybeSingle()

  let contactId = contact?.id as string | undefined
  if (!contactId) {
    const { data: made } = await supabase
      .from('contacts')
      .insert({
        org_id: orgId,
        name: booking.name,
        email: address,
        email_status: 'inferred',
        source: 'booked a call on the website (self-submitted, unverified)',
        verified_on: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single()
    contactId = made?.id
  }

  // CASL. Booking a call is inbound contact — an express basis for replying to the
  // person who did it. But the send-gate reads consent at the ORGANISATION level, so
  // recording a basis against an org that already exists in the pipeline would let
  // anyone who can get through the booking form unlock outreach to every contact at a
  // researched prospect by naming it. That is consent forgery, and it is what the
  // ledger exists to stop.
  //
  // So a basis is recorded only when this booking is what created the organisation —
  // a brand-new org has no other contacts, so the scope is the one address that was
  // typed in. Linking to an existing prospect records nothing and an operator decides.
  //
  // Without this the org sits at "No consent basis recorded" and every send refuses,
  // which is the same state the contact form already avoids for the identical case.
  if (orgIsNew && contactId) {
    await supabase.from('consent_ledger').insert({
      org_id: orgId,
      contact_id: contactId,
      basis: 'express_inbound_unverified',
      source_url: 'kasandyconsulting.com booking form',
    })
  }

  const { error: linkError } = await supabase
    .from('bookings')
    .update({ org_id: orgId, contact_id: contactId ?? null, linked_by: user!.email })
    .eq('id', args.bookingId)

  if (linkError) return { ok: false, error: linkError.message }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'booking.linked',
    entity: 'bookings',
    entity_id: args.bookingId,
    meta: { org_id: orgId, contact_id: contactId ?? null, created_org: !args.orgId },
  })

  revalidatePath('/calendar')
  revalidatePath(`/outreach/${orgId}`)
  return { ok: true, orgId }
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
