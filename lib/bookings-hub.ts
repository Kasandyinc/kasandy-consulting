import { slotToUTC, pacificLabel, SLOT_DURATION_MINS, utcToPacificParts } from './pacific-time.ts'

export { pacificLabel, utcToPacificParts }

/**
 * The calendar UID for a booking — derived from the row's own id, and nothing else.
 *
 * The website used to build this as `${date}-${time}-${Date.now()}` and discard it.
 * A UID with a clock in it cannot be reconstructed, and one that is never stored
 * cannot be looked up, so there was no way to send a client an UPDATE for an event
 * they already hold. Rescheduling would have produced a second event beside the
 * first; cancelling would have left the original in their calendar forever.
 *
 * Deriving it from the id means the value is stable for the life of the booking
 * without anything having to keep them in step. `bookings.ics_uid` still stores it,
 * because the column records what was actually sent — if this rule ever changes,
 * old bookings keep the UID their clients' calendars are matching on.
 */
export function icsUidFor(bookingId: string): string {
  return `${bookingId}@kasandyconsulting.com`
}

/**
 * The website's write into the hub's own bookings table.
 *
 * Website bookings had been landing in Vercel KV only. The hub reads Supabase, so
 * Calendar & Meetings showed "Nothing booked" while real calls were being taken and
 * confirmed by email — nothing errored, because no Supabase write was ever attempted.
 *
 * The service-role client is required: RLS on `bookings` grants only
 * `is_engine_operator()` to `authenticated`, and there is no `anon` policy, so the
 * publishable key cannot insert. This is the same client the contact form already
 * uses successfully via lib/forms/record.ts.
 */

/** Imported at call time, not at module load: keeps the mapping above pure. */
async function adminClient() {
  const { createAdminClient } = await import('./supabase/admin.ts')
  return createAdminClient()
}

export type HubBookingInput = {
  /** YYYY-MM-DD, in Pacific time — the slot grid is defined in Pacific. */
  date: string
  /** HH:MM, Pacific. */
  time: string
  name: string
  email: string
  topic: string
  /** The visitor's own IANA timezone, as detected in the browser. */
  visitorTimezone?: string | null
  meetingLink?: string | null
  /**
   * Where the booking came from. 'website' for the public form, 'hub' for one an
   * operator entered by hand. Defaulted rather than required so the website's call
   * site is unchanged, but always written explicitly to the row.
   */
  source?: 'website' | 'hub'
  /**
   * A website booking is 'requested' until Jackee confirms it. One she enters
   * herself is already arranged, so it starts 'confirmed' — asking her to confirm a
   * call she just booked by phone is a step that means nothing.
   */
  status?: 'requested' | 'confirmed'
  organisation?: string | null
  /** Overrides the 20-minute default. The hub can book longer calls. */
  durationMins?: number
  /** Replaces the generated provenance note entirely, when the caller has a better one. */
  notes?: string | null
}

export type HubBookingResult =
  | { ok: true; id: string }
  | { ok: false; kind: 'slot_taken'; error: string }
  | { ok: false; kind: 'failed'; error: string }

/**
 * The row exactly as the hub's schema expects it.
 *
 * Separated from the insert so the mapping can be checked without a database — the
 * column names here have to match a table this code cannot see at compile time, and
 * that is precisely the kind of pairing that drifts silently.
 */
export function bookingRow(input: HubBookingInput, id?: string) {
  return {
    // The id is chosen here rather than by the database so the invite UID, which is
    // derived from it, can go in on the same insert. Inserting first and filling the
    // UID in afterwards would leave a window where a booking exists with no way to
    // update its calendar event — the exact hole this work closes.
    ...(id ? { id, ics_uid: icsUidFor(id) } : {}),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    topic: input.topic.trim() || null,
    organisation: input.organisation?.trim() || null,
    starts_at: slotToUTC(input.date, input.time).toISOString(),
    duration_mins: input.durationMins ?? SLOT_DURATION_MINS,
    // The booking's own timezone is Pacific: that is the grid the slot came from and
    // the clock Jackee runs her day on. The visitor's timezone is kept in notes
    // rather than here, because putting it in this column would make the hub render
    // every booking in the client's local time — useful to them, wrong for the
    // person reading the calendar.
    timezone: 'America/Vancouver',
    status: input.status ?? ('requested' as const),
    // Set explicitly rather than leaning on the column default, so the origin of a
    // row is a decision this code made and not a property of the schema.
    source: input.source ?? 'website',
    meeting_link: input.meetingLink?.trim() || null,
    notes: input.notes?.trim() || defaultNotes(input),
  }
}

/**
 * Where the booking came from, in the column that holds provenance rather than the
 * one that holds what was said in the call. `notes` has always meant the former;
 * `meeting_notes` is the latter, and keeping them apart is why both survive.
 */
function defaultNotes(input: HubBookingInput): string {
  if ((input.source ?? 'website') === 'hub') return 'Entered in the hub by an operator.'
  return input.visitorTimezone && input.visitorTimezone !== 'Unknown'
    ? `Booked from the website. Visitor timezone: ${input.visitorTimezone}`
    : 'Booked from the website.'
}

/**
 * Insert the booking. The database's partial unique index on starts_at is the
 * authority on whether a slot is free — not KV, and not a prior read.
 */
export async function createHubBooking(input: HubBookingInput): Promise<HubBookingResult> {
  let db: Awaited<ReturnType<typeof adminClient>>
  try {
    db = await adminClient()
  } catch (err) {
    // SUPABASE_SECRET_KEY missing. Surfaced, never swallowed: a booking that does not
    // reach the hub is the entire bug this module exists to fix.
    const message = err instanceof Error ? err.message : 'Supabase admin client unavailable'
    console.error('[booking] cannot reach the hub database:', message)
    return { ok: false, kind: 'failed', error: message }
  }

  const id = crypto.randomUUID()
  const { data, error } = await db
    .from('bookings')
    .insert(bookingRow(input, id))
    .select('id')
    .single()

  if (error) {
    // 23505 — the partial unique index on starts_at where status is requested,
    // confirmed or held. Someone took this slot first.
    if (error.code === '23505') {
      return {
        ok: false,
        kind: 'slot_taken',
        error: 'This slot was just taken — please choose another.',
      }
    }
    console.error('[booking] insert failed:', error.code, error.message, error.details ?? '')
    return { ok: false, kind: 'failed', error: error.message }
  }

  return { ok: true, id: data.id as string }
}

/**
 * M-02 — "Meeting booked with [org] — [date]".
 *
 * Written to audit_log rather than a notifications table: the Calendar already
 * highlights bookings still marked `requested`, and the dashboard already surfaces
 * work needing attention, so a second alert store would be a second place for the
 * same fact to go stale.
 *
 * Best-effort. The booking is already saved and the client is already being emailed;
 * failing the request because a log line did not write would be the wrong trade.
 */
export async function notifyBookingCreated(args: {
  bookingId: string
  name: string
  email: string
  topic: string
  startsAt: string
  whenLabel: string
  organisation?: string | null
}) {
  try {
    const db = await adminClient()
    await db.from('audit_log').insert({
      actor: 'website',
      action: 'booking.created',
      entity: 'bookings',
      entity_id: args.bookingId,
      meta: {
        message: `Meeting booked with ${args.organisation?.trim() || args.name} — ${args.whenLabel}`,
        name: args.name,
        email: args.email,
        topic: args.topic,
        starts_at: args.startsAt,
        source: 'website',
      },
    })
  } catch (err) {
    console.error('[booking] M-02 alert not recorded:', err)
  }
}

/**
 * Move a booking to a new time.
 *
 * An UPDATE of `starts_at` on the existing row — never a cancel-and-recreate. The
 * org link, the contact link, the meeting notes, the consent trail and the booking's
 * own id all hang off that row, and a new row would strand every one of them while
 * looking, in the calendar, like it had worked.
 *
 * The partial unique index `bookings_slot_unique` covers UPDATE exactly as it covers
 * INSERT, so moving onto an occupied slot raises 23505 and this function changes
 * nothing. That is the whole reason there is no read-then-write check here: between
 * a read and a write, the website can take the slot.
 *
 * `ics_sequence` is incremented in the same statement as the move. RFC 5545 says a
 * calendar client may ignore an update whose SEQUENCE is not higher than the one it
 * holds, so a reschedule sent at the old sequence would be accepted by us and
 * silently dropped by Outlook — a booking moved everywhere except in the one
 * calendar the client actually reads.
 */
export type RescheduleResult =
  | {
      ok: true
      uid: string
      sequence: number
      previousStartsAt: string
      previousStatus: string
      /** Set when the move had to bring the booking back under the unique index. */
      restoredStatus: string | null
    }
  | { ok: false; kind: 'slot_taken' | 'not_found' | 'failed'; error: string }

export async function rescheduleHubBooking(args: {
  bookingId: string
  /** Pacific date, YYYY-MM-DD. */
  date: string
  /** Pacific time, HH:MM. */
  time: string
}): Promise<RescheduleResult> {
  // See below: a booking outside the holding statuses is not covered by the unique
  // index, so moving one has to bring it back under cover in the same statement.
  let db: Awaited<ReturnType<typeof adminClient>>
  try {
    db = await adminClient()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Supabase admin client unavailable'
    return { ok: false, kind: 'failed', error: message }
  }

  const { data: existing } = await db
    .from('bookings')
    .select('id, starts_at, status, ics_uid, ics_sequence')
    .eq('id', args.bookingId)
    .maybeSingle()

  if (!existing) return { ok: false, kind: 'not_found', error: 'Booking not found.' }

  const nextSequence = (existing.ics_sequence ?? 0) + 1
  const uid = (existing.ics_uid as string | null) ?? icsUidFor(args.bookingId)

  /**
   * `bookings_slot_unique` is partial: it covers requested, confirmed and held, and
   * nothing else. A booking marked no_show or done has therefore dropped out of it.
   *
   * That is the case this whole feature was asked for — a client no-showed and wants
   * to rebook — and moving the row while it sits outside the index would put the call
   * in a slot the database is not protecting. The website would happily book straight
   * over it, and the conflict check here would pass while doing nothing.
   *
   * So a booking being moved is brought back under the index in the same statement
   * that moves it. A call that is going to happen is 'confirmed' by definition; a
   * no-show that has been rebooked is no longer a no-show.
   */
  const HOLDS_A_SLOT = ['requested', 'confirmed', 'held']
  const status = existing.status as string
  const restored = HOLDS_A_SLOT.includes(status) ? null : 'confirmed'

  const { error } = await db
    .from('bookings')
    .update({
      starts_at: slotToUTC(args.date, args.time).toISOString(),
      ics_sequence: nextSequence,
      // Backfills the UID for rows written before the column existed. Their clients
      // hold a different one, so this does not repair those invites — it stops the
      // NEXT change to the same booking from being a third event.
      ics_uid: uid,
      ...(restored ? { status: restored } : {}),
    })
    .eq('id', args.bookingId)

  if (error) {
    if (error.code === '23505') {
      return { ok: false, kind: 'slot_taken', error: 'That slot is already taken — nothing was changed.' }
    }
    console.error('[booking] reschedule failed:', error.code, error.message)
    return { ok: false, kind: 'failed', error: error.message }
  }

  return {
    ok: true,
    uid,
    sequence: nextSequence,
    previousStartsAt: existing.starts_at as string,
    previousStatus: status,
    restoredStatus: restored,
  }
}

/**
 * Claim the next SEQUENCE for an invite that is not a move — currently only a
 * cancellation. Same rule: a CANCEL at the sequence the client already holds can be
 * ignored, and the event stays in their calendar.
 */
export async function bumpIcsSequence(bookingId: string): Promise<{ uid: string; sequence: number } | null> {
  try {
    const db = await adminClient()
    const { data } = await db
      .from('bookings')
      .select('id, ics_uid, ics_sequence')
      .eq('id', bookingId)
      .maybeSingle()

    if (!data) return null

    const sequence = (data.ics_sequence ?? 0) + 1
    const uid = (data.ics_uid as string | null) ?? icsUidFor(bookingId)
    await db.from('bookings').update({ ics_sequence: sequence, ics_uid: uid }).eq('id', bookingId)
    return { uid, sequence }
  } catch (err) {
    console.error('[booking] could not bump the invite sequence:', err)
    return null
  }
}
