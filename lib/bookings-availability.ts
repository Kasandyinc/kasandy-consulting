/**
 * What the website means by "taken", read from the table that decides it.
 *
 * The website's availability came from Vercel KV: `slot:YYYY-MM-DD:HH:MM`, written
 * only by the public booking form. Supabase was never consulted. So a booking created
 * or moved in the hub blocked nothing on the website — the visitor was offered the
 * slot, filled in the whole form, and only then collided with the partial unique
 * index on `bookings.starts_at` and got a 409 at the last step. The hub's own promise
 * that "the website and this screen cannot double-book between them" was true only of
 * the write, never of what the visitor was shown.
 *
 * `public.bookings` is now the source of taken slots. KV keeps one job it is still
 * the only holder of: slots an operator has manually blocked from /admin/bookings,
 * which have no representation in the hub's schema at all.
 */

import { slotToUTC, utcToPacificParts } from './pacific-time'

/** The statuses that hold a slot. The same three the database's unique index uses. */
export const HOLDING_STATUSES = ['requested', 'confirmed', 'held'] as const

export type TakenSlot = {
  /** Pacific HH:MM the booking starts at. */
  time: string
  id: string
  name: string
}

/**
 * Every slot held by a booking on a given Pacific date.
 *
 * Returns null — distinct from an empty map — when the database could not be
 * reached. The caller needs to tell those apart: "nothing is booked" and "I do not
 * know what is booked" lead to opposite decisions, and conflating them is how a
 * calendar shows an outage as a free day.
 */
export async function takenSlotsForDate(dateStr: string): Promise<Map<string, TakenSlot> | null> {
  try {
    const { createAdminClient } = await import('./supabase/admin')
    const db = createAdminClient()

    // A window wider than the day, then filtered by the Pacific date itself. The
    // Pacific day is 23, 24 or 25 hours long depending on where the DST boundary
    // falls, and computing its exact edges twice — once here, once in the grid —
    // is another pair of facts to drift. Over-fetch and let one function decide.
    const anchor = slotToUTC(dateStr, '00:00').getTime()
    const from = new Date(anchor - 3 * 3_600_000).toISOString()
    const to   = new Date(anchor + 27 * 3_600_000).toISOString()

    const { data, error } = await db
      .from('bookings')
      .select('id, name, starts_at, status')
      .gte('starts_at', from)
      .lt('starts_at', to)
      .in('status', HOLDING_STATUSES as unknown as string[])

    if (error) {
      console.error('[availability] could not read bookings:', error.code, error.message)
      return null
    }

    const taken = new Map<string, TakenSlot>()
    for (const b of data ?? []) {
      const parts = utcToPacificParts(new Date(b.starts_at as string))
      if (parts.dateStr !== dateStr) continue
      taken.set(parts.timeStr, {
        time: parts.timeStr,
        id: b.id as string,
        name: b.name as string,
      })
    }
    return taken
  } catch (err) {
    console.error('[availability] hub database unreachable:', err)
    return null
  }
}
