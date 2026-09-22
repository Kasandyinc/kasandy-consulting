import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { kv } from '@/lib/kv'

/**
 * Health check for the website and the hub.
 *
 * Two jobs, and they are not the same job.
 *
 * 1 · Keep the stack awake. Supabase pauses a free-plan project after seven days
 *     without activity, and a paused project is not a degraded hub — it is a dead
 *     one. The website's booking form writes to `bookings` before it confirms
 *     anything, so a paused database does not merely hide the calendar: it turns
 *     every booking attempt on the public site into a 500. This route makes a real
 *     query, because a connection that is opened and dropped is not activity.
 *
 * 2 · Say what is wrong. A keepalive that only proves it can reach the database is
 *     a cron that goes green while the thing it guards rots. The `warnings` below
 *     are the drift this build has actually produced before: a call that happened
 *     and was never marked, a booking attached to no organisation, a row with no
 *     calendar UID.
 *
 * The distinction matters to whoever reads the result. `checks` failing means
 * something is broken and the run fails loudly. `warnings` means something needs
 * attention and the run still passes — because a job that is permanently red is a
 * job nobody reads, which is the same failure as having no check at all.
 */

export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  // Same shared secret the existing crons use. The endpoint reports operational
  // detail about real bookings, so it is not public.
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

type Check = { ok: boolean; detail: string; ms?: number }

async function timed<T>(fn: () => Promise<T>): Promise<{ value?: T; error?: string; ms: number }> {
  const started = Date.now()
  try {
    return { value: await fn(), ms: Date.now() - started }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err), ms: Date.now() - started }
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: Record<string, Check> = {}
  const warnings: string[] = []
  const now = new Date()

  // ── Required configuration ────────────────────────────────────────────────
  // Checked before anything tries to use them, so a missing variable reports as
  // itself rather than as a confusing connection failure downstream.
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
    'RESEND_API_KEY',
    'ENGINE_OPERATOR_EMAILS',
  ]
  const missing = required.filter((k) => !process.env[k]?.trim())
  checks.env = {
    ok: missing.length === 0,
    detail: missing.length ? `missing: ${missing.join(', ')}` : `${required.length} required variables present`,
  }

  // MEETING_LINK is not required — a booking can be taken without a standing room,
  // and Settings can supply one — but its absence is worth saying out loud, because
  // every invite goes out saying "link to follow" and nobody notices.
  if (!process.env.MEETING_LINK?.trim()) {
    warnings.push('MEETING_LINK is not set — invites will say "link to follow" unless Settings supplies one.')
  }

  // ── Supabase: the query that is also the keepalive ────────────────────────
  const db = await timed(async () => {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('bookings')
      .select('id, starts_at, status, org_id, ics_uid')
      .order('starts_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(`${error.code ?? 'error'}: ${error.message}`)
    return data ?? []
  })

  checks.supabase = db.error
    ? { ok: false, detail: db.error, ms: db.ms }
    : { ok: true, detail: `read ${db.value!.length} booking row(s)`, ms: db.ms }

  // ── What the rows say about the state of the business ─────────────────────
  if (db.value) {
    const rows = db.value
    const holding = ['requested', 'confirmed', 'held']

    const stale = rows.filter(
      (b) => holding.includes(b.status as string) && new Date(b.starts_at as string) < now,
    )
    if (stale.length) {
      warnings.push(
        `${stale.length} call(s) have passed but are still marked ${
          Array.from(new Set(stale.map((b) => String(b.status)))).join('/')
        } — mark them Done or No-show, or they keep holding their slot against new bookings.`,
      )
    }

    const requested = rows.filter((b) => b.status === 'requested')
    if (requested.length) {
      warnings.push(`${requested.length} booking(s) awaiting confirmation.`)
    }

    const unlinked = rows.filter(
      (b) => !b.org_id && !['cancelled', 'no_show'].includes(b.status as string),
    )
    if (unlinked.length) {
      warnings.push(
        `${unlinked.length} booking(s) not attached to an organisation — nothing after the call can start until they are.`,
      )
    }

    // A booking with no UID cannot be rescheduled or cancelled cleanly: the invite
    // would not match anything in the client's calendar.
    const noUid = rows.filter((b) => !b.ics_uid)
    if (noUid.length) {
      warnings.push(
        `${noUid.length} booking(s) have no calendar UID — reschedule and cancel cannot update the client's calendar for them.`,
      )
    }
  }

  // ── KV: still the only home for manually blocked slots ────────────────────
  const kvCheck = await timed(async () => {
    await kv.get('site:settings')
    return true
  })
  checks.kv = kvCheck.error
    ? { ok: false, detail: kvCheck.error, ms: kvCheck.ms }
    : { ok: true, detail: 'reachable', ms: kvCheck.ms }

  const ok = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    {
      ok,
      checked_at: now.toISOString(),
      checks,
      warnings,
    },
    // A non-2xx is what makes the scheduled run fail and send mail. Warnings do not
    // reach this: they are things to do, not things that are broken.
    { status: ok ? 200 : 503 },
  )
}
