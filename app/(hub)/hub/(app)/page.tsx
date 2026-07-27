import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const supabase = createClient()

  const [orgs, contacts, verified, flagged] = await Promise.all([
    supabase.from('orgs').select('*', { count: 'exact', head: true }),
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('orgs').select('*', { count: 'exact', head: true }).not('leader_name', 'is', null),
    supabase
      .from('orgs')
      .select('id,name,black_led,signoff_status,hold,hold_reason')
      .or('hold.eq.true,and(black_led.eq.true,signoff_status.eq.pending)'),
  ])

  const needsAttention = flagged.data ?? []
  const failed = orgs.error || contacts.error || flagged.error

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
          {needsAttention.length === 0 ? (
            <p className="empty">Nothing is blocked. The pipeline is clear.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'grid', gap: 12 }}>
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
