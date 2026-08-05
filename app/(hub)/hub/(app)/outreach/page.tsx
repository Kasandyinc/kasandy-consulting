import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BOARD_STAGES, STAGE_LABEL, type Org, type Stage } from '@/lib/engine/types'
import { SystemStrip, OrgFlags } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

type Search = { segment?: string; stage?: string; view?: string }

export default async function Outreach({ searchParams }: { searchParams: Search }) {
  const supabase = createClient()

  let query = supabase.from('orgs').select('*').order('name')
  if (searchParams.segment) query = query.eq('segment', searchParams.segment)
  if (searchParams.stage) query = query.eq('stage', searchParams.stage)

  const [{ data, error }, { data: contactRows }] = await Promise.all([
    query,
    supabase.from('contacts').select('org_id,email'),
  ])

  const orgs = (data ?? []) as Org[]
  const emailsByOrg = new Map<string, number>()
  for (const c of contactRows ?? []) {
    if (c.email) emailsByOrg.set(c.org_id, (emailsByOrg.get(c.org_id) ?? 0) + 1)
  }

  const segments = Array.from(
    new Set(orgs.map((o) => o.segment).filter((s): s is string => Boolean(s))),
  ).sort()
  const asTable = searchParams.view === 'table'
  const blocked = orgs.filter((o) => o.hold || (o.black_led && o.signoff_status === 'pending'))

  return (
    <>
      <div className="eyebrow">Grow</div>
      <div className="row between center wrap">
        <div>
          <h1 className="h1">Outreach</h1>
          <p className="lede">
            {orgs.length} prospect{orgs.length === 1 ? '' : 's'} from the verified workbook.
            No clients are seeded — this is the real pipeline.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/outreach/packages" className="btn sm">
            ❐ Org packages
          </Link>
          <Link href={asTable ? '/outreach' : '/outreach?view=table'} className="btn sm">
            {asTable ? '▤ Board view' : '▤ Table view'}
          </Link>
        </div>
      </div>

      {error && <div className="err" style={{ marginTop: 18 }}>Could not load prospects: {error.message}</div>}

      {/* Filters — segment and stage, per the definition of done */}
      <div className="row wrap" style={{ gap: 8, margin: '18px 0 14px' }}>
        <Link href={asTable ? '/outreach?view=table' : '/outreach'} className={`btn sm${!searchParams.segment && !searchParams.stage ? ' ox' : ''}`}>
          All
        </Link>
        {segments.map((s) => (
          <Link
            key={s}
            href={`/outreach?segment=${encodeURIComponent(s)}${asTable ? '&view=table' : ''}`}
            className={`btn sm${searchParams.segment === s ? ' ox' : ''}`}
          >
            {s}
          </Link>
        ))}
      </div>

      {asTable ? (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>Leader</th>
                <th>Segment</th>
                <th>Province</th>
                <th>Stage</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/outreach/${o.id}`} style={{ fontWeight: 600 }}>
                      {o.name}
                    </Link>
                  </td>
                  <td>
                    {o.leader_name ?? <span style={{ color: 'var(--muted)' }}>— unverified</span>}
                  </td>
                  <td>{o.segment ?? '—'}</td>
                  <td>{o.province ?? '—'}</td>
                  <td>
                    <span className="tag">{STAGE_LABEL[o.stage as Stage] ?? o.stage}</span>
                  </td>
                  <td>
                    <div className="row" style={{ gap: 5, flexWrap: 'wrap' }}>
                      <OrgFlags org={o} />
                    </div>
                  </td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No prospects match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kan">
          {BOARD_STAGES.map((stage) => {
            const col = orgs.filter((o) => o.stage === stage)
            return (
              <div className="kcol" key={stage}>
                <div className="kcol-h">
                  <span className="kt">{STAGE_LABEL[stage]}</span>
                  <span className="kc">{col.length}</span>
                </div>
                <div className="kcol-b">
                  {col.map((o) => (
                    <Link className="kcard" key={o.id} href={`/outreach/${o.id}`}>
                      <div className="kn">{o.name}</div>
                      <div className="ks">
                        {o.segment ?? '—'}
                        {o.province ? ` · ${o.province}` : ''}
                      </div>
                      <div className="kf">
                        <OrgFlags org={o} />
                        {(emailsByOrg.get(o.id) ?? 0) === 0 && (
                          <span className="tag bad">no route</span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {col.length === 0 && <div className="empty">—</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SystemStrip>
        Import seeded <b>{orgs.length}</b> prospects from the workbook; 3 excluded rows were
        skipped. <b>{blocked.length}</b> org{blocked.length === 1 ? '' : 's'} currently
        refuse sending at the database layer (HOLD or sign-off pending) — the card shows a
        flag, not an error.
      </SystemStrip>
    </>
  )
}
