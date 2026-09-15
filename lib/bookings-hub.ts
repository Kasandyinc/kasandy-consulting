import { slotToUTC, pacificLabel, SLOT_DURATION_MINS } from './pacific-time.ts'

export { pacificLabel }

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
export function bookingRow(input: HubBookingInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    topic: input.topic.trim() || null,
    starts_at: slotToUTC(input.date, input.time).toISOString(),
    duration_mins: SLOT_DURATION_MINS,
    // The booking's own timezone is Pacific: that is the grid the slot came from and
    // the clock Jackee runs her day on. The visitor's timezone is kept in notes
    // rather than here, because putting it in this column would make the hub render
    // every booking in the client's local time — useful to them, wrong for the
    // person reading the calendar.
    timezone: 'America/Vancouver',
    status: 'requested' as const,
    // Set explicitly rather than leaning on the column default, so the origin of a
    // row is a decision this code made and not a property of the schema.
    source: 'website',
    meeting_link: input.meetingLink?.trim() || null,
    notes: input.visitorTimezone && input.visitorTimezone !== 'Unknown'
      ? `Booked from the website. Visitor timezone: ${input.visitorTimezone}`
      : 'Booked from the website.',
  }
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

  const { data, error } = await db.from('bookings').insert(bookingRow(input)).select('id').single()

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
