import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const supabase = createClient()

  const [orgs, contacts, verified, flagged, awaiting, enquiries] = await Promise.all([
    supabase.from('orgs').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('orgs').select('*', { count: 'exact', head: true }).not('leader_name', 'is', null),
    supabase
      .from('orgs')
      .select('id,name,black_led,signoff_status,hold,hold_reason')
      .or('hold.eq.true,and(black_led.eq.true,signoff_status.eq.pending)'),
    // M-02 · a booking taken on the website arrives as `requested` and stays there
    // until someone confirms it. That status is the alert; this is where it is read.
    supabase
      .from('bookings')
      .select('id,name,organisation,starts_at,timezone')
      .eq('status', 'requested')
      .order('starts_at'),
    // A-02 · the same idea for the contact form: `new` until an operator handles it.
    supabase
      .from('submissions')
      .select('id,name,organisation,submitted_at')
      .eq('status', 'new')
      .order('submitted_at', { ascending: false })
      .limit(10),
  ])

  const needsAttention = flagged.data ?? []
  const newBookings = awaiting.data ?? []
  const newEnquiries = enquiries.data ?? []
  const nothingToDo =
    needsAttention.length === 0 && newBookings.length === 0 && newEnquiries.length === 0
  const failed = orgs.error || contacts.error || flagged.error

  const when = (iso: string, tz: string | null) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'America/Vancouver',
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    }).format(new Date(iso))

  return (
    <>
      <div className="eyebrow">Overview</div>
      <h1 className="h1">Dashboard</h1>
      <p className="lede">
        Phase 1 is live: the prospect pipeline runs on real data. Money, Delivery, and the
        client portal arrive in their own phases.
      </p>

      {failed && (
        <div className="err" style={{ marginTop: 18 }}>
          Could not read from Supabase: {failed.message}
        </div>
      )}

      <div className="grid g4" style={{ marginTop: 22 }}>
        <div className="stat">
          <div className="n">{orgs.count ?? 0}</div>
          <div className="l">Prospect organisations</div>
        </div>
        <div className="stat i">
          <div className="n">{contacts.count ?? 0}</div>
          <div className="l">Contact rows</div>
        </div>
        <div className="stat g">
          <div className="n">{verified.count ?? 0}</div>
          <div className="l">Leaders with provenance</div>
        </div>
        <div className="stat w">
          <div className="n">{needsAttention.length}</div>
          <div className="l">Blocked / awaiting sign-off</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-h between">
          <h3>Do next</h3>
          <Link href="/outreach" className="btn sm">
            Open Outreach →
          </Link>
        </div>
        <div className="card-b">
          {nothingToDo ? (
            <p className="empty">Nothing is blocked. The pipeline is clear.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
              {newBookings.map((b) => (
                <li key={b.id} className="row between center">
                  <Link href="/calendar" style={{ fontWeight: 600 }}>
                    Meeting booked with {b.organisation || b.name} — {when(b.starts_at, b.timezone)}
                  </Link>
                  <span className="tag warn">⚑ Confirm</span>
                </li>
              ))}
              {newEnquiries.map((s) => (
                <li key={s.id} className="row between center">
                  <Link href="/cms/submissions" style={{ fontWeight: 600 }}>
                    New enquiry from {s.name || 'someone'}
                    {s.organisation ? ` (${s.organisation})` : ''}
                  </Link>
                  <span className="tag warn">⚑ Unread</span>
                </li>
              ))}
              {needsAttention.map((o) => (
                <li key={o.id} className="row between center">
                  <Link href={`/outreach/${o.id}`} style={{ fontWeight: 600 }}>
                    {o.name}
                  </Link>
                  <span className={`tag ${o.hold ? 'hold' : 'warn'}`}>
                    {o.hold ? '◼ HOLD' : '⚑ Needs your sign-off'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <SystemStrip>
        Nightly sequence advancement is scheduled but idle — no sequences are staged yet.
        Sending stays one-click until a per-template toggle is flipped.
      </SystemStrip>
    </>
  )
}
