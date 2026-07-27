import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayInTimezone } from '@/lib/engine/sequence'

/**
 * Daily sequence advancement (§8). Runs 07:00 America/Vancouver via Vercel Cron.
 *
 * It only ever moves due steps `staged → ready`. It does not send. "Ready" means
 * waiting for Jackee's click — unattended sending does not exist in Phase 1 (§7.9),
 * and AUTO-eligible templates still queue for one-click.
 */
export const dynamic = 'force-dynamic'

function authorized(req: NextRequest): boolean {
  // The x-vercel-cron header is not a credential — any caller can set it — so the
  // shared secret is required. Vercel Cron sends it as a bearer token when
  // CRON_SECRET is configured on the project.
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: settings } = await supabase.from('settings').select('timezone').maybeSingle()
  const tz = settings?.timezone ?? 'America/Vancouver'
  const today = todayInTimezone(tz)

  // Only advance steps on sequences that are actually running.
  const { data: liveSequences } = await supabase
    .from('sequences')
    .select('id')
    .in('status', ['staged', 'live'])

  const ids = (liveSequences ?? []).map((s) => s.id)
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, today, advanced: 0, note: 'no live sequences' })
  }

  const { data: advanced, error } = await supabase
    .from('sequence_steps')
    .update({ status: 'ready' })
    .eq('status', 'staged')
    .lte('due_on', today)
    .in('sequence_id', ids)
    .select('id')

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const count = advanced?.length ?? 0

  if (count > 0) {
    await supabase.from('audit_log').insert({
      actor: 'system',
      action: 'sequence.advance',
      entity: 'sequence_steps',
      meta: { advanced: count, as_of: today, timezone: tz },
    })
  }

  return NextResponse.json({ ok: true, today, timezone: tz, advanced: count })
}
