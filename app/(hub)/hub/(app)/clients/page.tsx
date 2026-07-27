import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatMoney, summarise, type Invoice, type Payment } from '@/lib/engine/money'
import { SystemStrip } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const supabase = createClient()

  const [{ data: clientRows }, { data: engagements }, { data: invoices }, { data: payments }] =
    await Promise.all([
      supabase.from('clients').select('*, orgs(id, name, segment, province)').order('signed_on', { ascending: false }),
      supabase.from('engagements').select('*'),
      supabase.from('invoices').select('*'),
      supabase.from('payments').select('*'),
    ])

  const clients = (clientRows ?? []) as {
    id: string
    org_id: string
    signed_on: string | null
    notes: string | null
    orgs: { id: string; name: string; segment: string | null; province: string | null } | null
  }[]

  const engagementRows = (engagements ?? []) as {
    id: string
    client_id: string
    name: string
    phase: string | null
    verified_at: string | null
  }[]

  const money = summarise((invoices ?? []) as Invoice[], (payments ?? []) as Payment[])

  return (
    <>
      <div className="eyebrow">Grow</div>
      <h1 className="h1">Clients</h1>
      <p className="lede">
        Organisations that have signed. A client record is created by acceptance of a
        proposal, never by hand — so this list and the signed proposals cannot disagree.
      </p>

      <div className="grid g4" style={{ marginTop: 20 }}>
        <div className="stat">
          <div className="n">{clients.length}</div>
          <div className="l">Clients</div>
        </div>
        <div className="stat i">
          <div className="n">{engagementRows.length}</div>
          <div className="l">Engagements</div>
        </div>
        <div className="stat g">
          <div className="n">{formatMoney(money.collectedCents)}</div>
          <div className="l">Collected</div>
        </div>
        <div className="stat w">
          <div className="n">{formatMoney(money.outstandingCents)}</div>
          <div className="l">Outstanding</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h between">
          <h3>Client list</h3>
          <Link href="/outreach" className="btn sm">
            Pipeline →
          </Link>
        </div>
        <table>
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Segment</th>
              <th>Signed</th>
              <th>Engagements</th>
              <th>Verified phases</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => {
              const mine = engagementRows.filter((e) => e.client_id === c.id)
              const verified = mine.filter((e) => e.verified_at).length
              return (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.orgs?.name ?? '—'}</div>
                    {c.notes && (
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                        {c.notes}
                      </div>
                    )}
                  </td>
                  <td>{c.orgs?.segment ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{c.signed_on ?? '—'}</td>
                  <td>{mine.length}</td>
                  <td>
                    {mine.length === 0 ? (
                      '—'
                    ) : verified === mine.length ? (
                      <span className="tag good">all {verified}</span>
                    ) : (
                      <span className="tag warn">{verified} of {mine.length}</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/clients/${c.id}`} className="btn sm">
                      Open
                    </Link>
                  </td>
                </tr>
              )
            })}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No clients yet — 29 prospects, 0 signed. A signed proposal creates the
                  first row here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SystemStrip>
        Client records are created inside the same transaction that records a proposal
        signature, so an accepted proposal can never sit without a client to invoice.
      </SystemStrip>
    </>
  )
}
