'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import type { BookingStatus } from '@/lib/engine/delivery'
import {
  createHubBooking,
  rescheduleHubBooking,
  bumpIcsSequence,
  icsUidFor,
  utcToPacificParts,
} from '@/lib/bookings-hub'
import {
  sendBookingCreated,
  sendBookingRescheduled,
  sendBookingCancelled,
} from '@/lib/booking-notify'
import { getSlotStatuses, isDateBookable, getDaySlots, getDayOfWeek } from '@/lib/bookings'
import { SLOT_DURATION_MINS, slotToUTC } from '@/lib/pacific-time'

const STATUSES: BookingStatus[] = ['requested', 'confirmed', 'held', 'done', 'no_show', 'cancelled']

/**
 * Move a booking along. Cancelling releases the slot for someone else to take.
 *
 * Cancellation is deliberately NOT reachable from here any more. It used to change
 * `status` and stop, which left the client holding a calendar entry for a call
 * nobody would hold and no notice that it was off. `cancelBooking` below does the
 * same status change and sends the cancellation, so refusing it here means there is
 * no path in the hub that cancels a booking silently.
 */
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
  if (args.status === 'cancelled') {
    return { ok: false, error: 'Use Cancel, which also tells the client. Nothing was changed.' }
  }

  const { error } = await supabase
    .from('bookings')
    // No cancelled_reason branch: cancellation returned above, so this only ever
    // moves a booking between the statuses that do not need to tell the client.
    .update({ status: args.status })
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

// ─── Availability, as the website computes it ────────────────────────────────

export type SlotOption = {
  time: string
  status: 'available' | 'booked' | 'blocked'
  /** True when this is the slot the booking being moved already occupies. */
  current?: boolean
}

/**
 * The slots for a date, under the website's own rules.
 *
 * Deliberately the same functions the public form calls — `getDaySlots` for the grid,
 * `isDateBookable` for the window, `getSlotStatuses` for what is taken. A second
 * implementation of "when is Jackee free" in the hub would be a second answer to the
 * question, and the two would disagree the first time the availability config moved.
 *
 * `bookable` is false for a date the website would not offer at all: not a Monday or
 * Friday, inside the 24-hour notice window, or past the two-month horizon. The hub
 * still returns the grid in that case, because an operator is allowed to override it
 * — a client who no-showed this morning and wants to rebook this afternoon is the
 * case that exists, and the website's notice period is not a rule about Jackee.
 */
export async function slotOptionsForDate(args: {
  date: string
  /** Its own slot is not a conflict when a booking is being moved. */
  excludeBookingId?: string
}): Promise<{
  ok: boolean
  error?: string
  bookable?: boolean
  slots?: SlotOption[]
}> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date)) return { ok: false, error: 'Invalid date.' }

  const grid = getDaySlots(getDayOfWeek(args.date))
  if (!grid.length) {
    return { ok: true, bookable: false, slots: [] }
  }

  const statuses = await getSlotStatuses(args.date)

  let currentTime: string | null = null
  if (args.excludeBookingId) {
    const { data } = await supabase
      .from('bookings')
      .select('starts_at')
      .eq('id', args.excludeBookingId)
      .maybeSingle()
    if (data) {
      const parts = utcToPacificParts(new Date(data.starts_at as string))
      if (parts.dateStr === args.date) currentTime = parts.timeStr
    }
  }

  const slots: SlotOption[] = grid.map((time) => ({
    time,
    // A booking does not conflict with itself: leaving its own slot marked "booked"
    // would make the one time it is already at look unavailable to move to.
    status: time === currentTime ? 'available' : (statuses[time] ?? 'available'),
    ...(time === currentTime ? { current: true } : {}),
  }))

  return { ok: true, bookable: isDateBookable(args.date), slots }
}

// ─── Task 2 · Reschedule ─────────────────────────────────────────────────────

/**
 * Move a booking to a new time.
 *
 * The row is updated, never replaced. A cancel-and-recreate would give the client a
 * new booking id, orphan the org and contact links, drop the meeting notes and the
 * consent trail, and look — from the calendar — exactly like it had worked.
 *
 * The emails go out only after the database says the move succeeded. On 23505 the
 * slot belongs to someone else, nothing is changed, and nothing is sent: a
 * "rescheduled" notice for a move that did not happen is worse than an error the
 * operator can act on.
 */
export async function rescheduleBooking(args: {
  bookingId: string
  /** Pacific date, YYYY-MM-DD. */
  date: string
  /** Pacific time, HH:MM. */
  time: string
  /** Set when the chosen time is outside the website's availability rules. */
  override?: boolean
  /** Off when the operator has already agreed the new time with the client. */
  notifyClient?: boolean
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date) || !/^\d{2}:\d{2}$/.test(args.time)) {
    return { ok: false, error: 'Invalid date or time.' }
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', args.bookingId)
    .maybeSingle()

  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (booking.status === 'cancelled') {
    return { ok: false, error: 'This booking is cancelled. Create a new one instead of moving it.' }
  }

  // The website's rules, enforced here unless the operator has said otherwise. The
  // override is explicit rather than implied by the hub being the hub: an accidental
  // 3am slot should take a deliberate click, not a typo.
  const onGrid = getDaySlots(getDayOfWeek(args.date)).includes(args.time)
  if ((!onGrid || !isDateBookable(args.date)) && !args.override) {
    return {
      ok: false,
      error: 'That time is outside the availability the website offers. Tick the override to book it anyway.',
    }
  }

  const moved = await rescheduleHubBooking({
    bookingId: args.bookingId,
    date: args.date,
    time: args.time,
  })

  if (!moved.ok) {
    // 23505. The partial unique index is the source of truth, and it said no.
    return { ok: false, error: moved.error }
  }

  const previous = utcToPacificParts(new Date(moved.previousStartsAt))

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'booking.rescheduled',
    entity: 'bookings',
    entity_id: args.bookingId,
    meta: {
      from: moved.previousStartsAt,
      to: slotToUTC(args.date, args.time).toISOString(),
      from_label: `${previous.dateStr} ${previous.timeStr} Pacific`,
      to_label: `${args.date} ${args.time} Pacific`,
      override: !!args.override,
      ics_sequence: moved.sequence,
      notified_client: args.notifyClient !== false,
      from_status: moved.previousStatus,
      // Set when the booking was outside the partial unique index (a no-show, a
      // completed call) and the move had to bring it back under cover.
      restored_status: moved.restoredStatus,
    },
  })

  const { data: settings } = await supabase
    .from('settings')
    .select('default_meeting_link')
    .maybeSingle()

  const meetingLink =
    booking.meeting_link?.trim() ||
    settings?.default_meeting_link?.trim() ||
    process.env.MEETING_LINK?.trim() ||
    ''

  const mail = await sendBookingRescheduled({
    facts: {
      name: booking.name,
      email: booking.email,
      topic: booking.topic ?? 'Strategy call',
      date: args.date,
      time: args.time,
      durationMins: booking.duration_mins ?? SLOT_DURATION_MINS,
      meetingLink,
      timezone: null,
      previousDate: previous.dateStr,
      previousTime: previous.timeStr,
    },
    invite: { uid: moved.uid, sequence: moved.sequence },
    notifyClient: args.notifyClient !== false,
  })

  revalidatePath('/calendar')
  // The move succeeded even if the mail did not. Saying otherwise would have the
  // operator try again and collide with the row they just wrote.
  return {
    ok: true,
    emailSent: mail.sent,
    restoredStatus: moved.restoredStatus,
    ...(mail.sent ? {} : { warning: `Booking moved, but the email did not send: ${mail.error}` }),
  }
}

// ─── Task 3 · A booking created in the hub ───────────────────────────────────

/**
 * Take a booking Jackee arranged herself.
 *
 * `source` is 'hub' and `status` is 'confirmed': a call agreed on the phone is not
 * awaiting anyone's confirmation, and counting it as a website booking would misstate
 * where the work comes from in every funnel that reads that column.
 *
 * The organisation follows the rule `linkBookingToOrg` already established — match an
 * existing org by name before creating one, and create at stage 0_unverified with a
 * note saying nothing about it has been researched. A name typed into a form is a
 * claim; a name typed into the hub is the same claim from a different keyboard.
 */
export async function createBookingFromHub(args: {
  name: string
  email: string
  organisation?: string
  /** An existing org to attach to. Takes precedence over `organisation`. */
  orgId?: string
  topic: string
  /** Pacific date, YYYY-MM-DD. */
  date: string
  /** Pacific time, HH:MM. */
  time: string
  durationMins?: number
  override?: boolean
  /** "Send confirmation to client" — off when it has already been arranged directly. */
  notifyClient?: boolean
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const name = args.name.trim()
  const email = args.email.trim().toLowerCase()
  if (!name || !email) return { ok: false, error: 'A name and an email address are required.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'That email address does not look right.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(args.date) || !/^\d{2}:\d{2}$/.test(args.time)) {
    return { ok: false, error: 'Invalid date or time.' }
  }

  const duration = args.durationMins ?? SLOT_DURATION_MINS
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    return { ok: false, error: 'Duration has to be between 5 and 480 minutes.' }
  }

  const onGrid = getDaySlots(getDayOfWeek(args.date)).includes(args.time)
  if ((!onGrid || !isDateBookable(args.date)) && !args.override) {
    return {
      ok: false,
      error: 'That time is outside the availability the website offers. Tick the override to book it anyway.',
    }
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('default_meeting_link')
    .maybeSingle()

  const meetingLink =
    settings?.default_meeting_link?.trim() || process.env.MEETING_LINK?.trim() || ''

  // ── Write first. Nothing is promised to anyone before the row exists. ──────
  const created = await createHubBooking({
    date: args.date,
    time: args.time,
    name,
    email,
    topic: args.topic,
    organisation: args.organisation,
    meetingLink,
    source: 'hub',
    status: 'confirmed',
    durationMins: duration,
  })

  if (!created.ok) {
    // 'slot_taken' is the unique index refusing a double booking, exactly as it does
    // for the website. Nothing was written, so nothing is sent.
    return { ok: false, error: created.error }
  }

  // ── Organisation, by the rule the booking→org weld already uses ────────────
  const orgResult = await attachOrgToHubBooking({
    supabase,
    bookingId: created.id,
    actor: user!.email!,
    name,
    email,
    orgId: args.orgId,
    organisation: args.organisation,
  })

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'booking.created',
    entity: 'bookings',
    entity_id: created.id,
    meta: {
      message: `Meeting booked with ${args.organisation?.trim() || name} — ${args.date} ${args.time} Pacific`,
      name,
      email,
      topic: args.topic,
      starts_at: slotToUTC(args.date, args.time).toISOString(),
      source: 'hub',
      duration_mins: duration,
      override: !!args.override,
      notified_client: args.notifyClient !== false,
      org_id: orgResult.orgId ?? null,
    },
  })

  const mail = await sendBookingCreated({
    facts: {
      name,
      email,
      topic: args.topic || 'Strategy call',
      date: args.date,
      time: args.time,
      durationMins: duration,
      meetingLink,
      timezone: null,
    },
    invite: { uid: icsUidFor(created.id), sequence: 0 },
    notifyClient: args.notifyClient !== false,
  })

  revalidatePath('/calendar')
  if (orgResult.orgId) revalidatePath(`/outreach/${orgResult.orgId}`)

  return {
    ok: true,
    id: created.id,
    emailSent: mail.sent,
    ...(mail.sent ? {} : { warning: `Booking saved, but the email did not send: ${mail.error}` }),
  }
}

/**
 * The org side of a hub-created booking.
 *
 * Same shape as `linkBookingToOrg`: match by name before creating, create at
 * 0_unverified, add the person as an `inferred` contact.
 *
 * The consent basis is recorded here for a newly created org, on the same
 * express-inbound footing as a website booking — Jackee's instruction, on the
 * grounds that she only enters a booking for someone who asked her for one. As in
 * `linkBookingToOrg` it is recorded ONLY when this booking created the org: against
 * an org already in the pipeline it would unlock outreach to every contact there on
 * the strength of one typed name, which is the forgery the ledger exists to stop.
 */
async function attachOrgToHubBooking(args: {
  supabase: ReturnType<typeof createClient>
  bookingId: string
  actor: string
  name: string
  email: string
  orgId?: string
  organisation?: string
}): Promise<{ orgId?: string }> {
  const { supabase } = args
  let orgId = args.orgId
  let orgIsNew = false

  if (!orgId) {
    const claimed = args.organisation?.trim()
    if (!claimed) return {}

    const { data: existing } = await supabase
      .from('orgs')
      .select('id')
      .ilike('name', claimed)
      .maybeSingle()

    if (existing) {
      orgId = existing.id
    } else {
      const { data: made, error } = await supabase
        .from('orgs')
        .insert({
          name: claimed,
          stage: '0_unverified',
          notes: 'Created from a booking entered in the hub — nothing here is verified.',
        })
        .select('id')
        .single()
      if (error || !made) return {}
      orgId = made.id
      orgIsNew = true
    }
  }

  const { data: contact } = await supabase
    .from('contacts')
    .select('id')
    .eq('org_id', orgId)
    .ilike('email', args.email)
    .maybeSingle()

  let contactId = contact?.id as string | undefined
  if (!contactId) {
    const { data: made } = await supabase
      .from('contacts')
      .insert({
        org_id: orgId,
        name: args.name,
        email: args.email,
        email_status: 'inferred',
        source: 'booked a call, entered in the hub by an operator (unverified)',
        verified_on: new Date().toISOString().slice(0, 10),
      })
      .select('id')
      .single()
    contactId = made?.id
  }

  if (orgIsNew && contactId) {
    await supabase.from('consent_ledger').insert({
      org_id: orgId,
      contact_id: contactId,
      basis: 'express_inbound_unverified',
      source_url: 'booking entered in the hub',
    })
  }

  await supabase
    .from('bookings')
    .update({ org_id: orgId, contact_id: contactId ?? null, linked_by: args.actor })
    .eq('id', args.bookingId)

  await supabase.from('audit_log').insert({
    actor: args.actor,
    action: 'booking.linked',
    entity: 'bookings',
    entity_id: args.bookingId,
    meta: { org_id: orgId, contact_id: contactId ?? null, created_org: orgIsNew },
  })

  return { orgId }
}

// ─── Task 4 · Edit details, quietly ──────────────────────────────────────────

/**
 * Change what the call is about without telling anyone.
 *
 * Deliberately sends nothing. Correcting a typo in a topic or lengthening a call by
 * ten minutes does not need to land in a client's inbox, and a system that emails on
 * every edit trains people to stop reading its email — which is how the one that
 * matters, the reschedule, gets missed.
 *
 * `starts_at` is not editable here. Moving a booking is a reschedule: it has to go
 * through the unique index, bump the invite sequence and send the notice, and an
 * "edit" that quietly changed the time would do none of those.
 */
export async function editBookingDetails(args: {
  bookingId: string
  topic?: string
  notes?: string
  durationMins?: number
  meetingLink?: string
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { data: before } = await supabase
    .from('bookings')
    .select('id, topic, notes, duration_mins, meeting_link')
    .eq('id', args.bookingId)
    .maybeSingle()

  if (!before) return { ok: false, error: 'Booking not found.' }

  const patch: Record<string, unknown> = {}

  if (args.topic !== undefined) patch.topic = args.topic.trim() || null
  if (args.notes !== undefined) patch.notes = args.notes.trim() || null

  if (args.durationMins !== undefined) {
    const d = Number(args.durationMins)
    if (!Number.isInteger(d) || d < 5 || d > 480) {
      return { ok: false, error: 'Duration has to be between 5 and 480 minutes.' }
    }
    patch.duration_mins = d
  }

  if (args.meetingLink !== undefined) {
    const link = args.meetingLink.trim()
    if (link && !/^https:\/\/\S+$/i.test(link)) {
      return { ok: false, error: 'A meeting link has to be an https:// URL.' }
    }
    patch.meeting_link = link || null
  }

  if (!Object.keys(patch).length) return { ok: true, changed: [] }

  const { error } = await supabase.from('bookings').update(patch).eq('id', args.bookingId)
  if (error) return { ok: false, error: error.message }

  // Only what actually moved. An audit line listing every field on every save makes
  // the log unreadable at exactly the moment somebody needs to read it.
  const changed: Record<string, { from: unknown; to: unknown }> = {}
  for (const [key, to] of Object.entries(patch)) {
    const from = (before as Record<string, unknown>)[key]
    if (from !== to) changed[key] = { from, to }
  }

  if (Object.keys(changed).length) {
    await supabase.from('audit_log').insert({
      actor: user!.email,
      action: 'booking.details_edited',
      entity: 'bookings',
      entity_id: args.bookingId,
      meta: { changed, emailed: false },
    })
  }

  revalidatePath('/calendar')
  return { ok: true, changed: Object.keys(changed) }
}

// ─── Task 5 · Cancel, and say so ─────────────────────────────────────────────

/**
 * Cancel a booking and tell the client.
 *
 * Cancelling used to change `status` and stop. The slot was released and the hub
 * looked right, but the client kept a calendar entry for a call nobody was going to
 * hold, and never heard that it was off.
 *
 * The .ics is METHOD:CANCEL carrying the booking's original UID and a higher
 * SEQUENCE, which is what makes the event disappear rather than sit there. A
 * cancellation under a fresh UID matches nothing in their calendar and does nothing
 * at all — it is the same defect as the duplicate reschedule, in the direction
 * nobody notices, because the client sees no new event and assumes it worked.
 */
export async function cancelBooking(args: {
  bookingId: string
  reason?: string
  /** "Don't email the client" — for a cancellation already handled by phone. */
  suppressEmail?: boolean
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', args.bookingId)
    .maybeSingle()

  if (!booking) return { ok: false, error: 'Booking not found.' }
  if (booking.status === 'cancelled') return { ok: false, error: 'This booking is already cancelled.' }

  // The sequence is claimed before the status changes, because once the booking is
  // cancelled the invite still has to be valid enough for a calendar to act on.
  const invite = (await bumpIcsSequence(args.bookingId)) ?? {
    uid: icsUidFor(args.bookingId),
    sequence: 1,
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_reason: args.reason?.trim() || null })
    .eq('id', args.bookingId)

  if (error) return { ok: false, error: error.message }

  const when = utcToPacificParts(new Date(booking.starts_at as string))

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'booking.cancelled',
    entity: 'bookings',
    entity_id: args.bookingId,
    meta: {
      starts_at: booking.starts_at,
      when_label: `${when.dateStr} ${when.timeStr} Pacific`,
      reason: args.reason?.trim() || null,
      ics_sequence: invite.sequence,
      notified_client: !args.suppressEmail,
    },
  })

  const { data: settings } = await supabase
    .from('settings')
    .select('default_meeting_link')
    .maybeSingle()

  const mail = await sendBookingCancelled({
    facts: {
      name: booking.name,
      email: booking.email,
      topic: booking.topic ?? 'Strategy call',
      date: when.dateStr,
      time: when.timeStr,
      durationMins: booking.duration_mins ?? SLOT_DURATION_MINS,
      meetingLink:
        booking.meeting_link?.trim() ||
        settings?.default_meeting_link?.trim() ||
        process.env.MEETING_LINK?.trim() ||
        '',
      timezone: null,
      reason: args.reason?.trim() || null,
    },
    invite,
    notifyClient: !args.suppressEmail,
  })

  revalidatePath('/calendar')
  return {
    ok: true,
    emailSent: mail.sent,
    ...(mail.sent ? {} : { warning: `Booking cancelled, but the email did not send: ${mail.error}` }),
  }
}
