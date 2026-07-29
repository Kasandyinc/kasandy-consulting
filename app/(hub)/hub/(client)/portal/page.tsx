import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/engine/money'
import { mdToHtml } from '@/lib/engine/proposal-md'
import VerifyPanel from './VerifyPanel'
import SignOutButton from '../../(app)/SignOutButton'

export const dynamic = 'force-dynamic'

const PHASE_TAG: Record<string, string> = {
  planned: 'hold',
  active: 'info',
  in_review: 'warn',
  verified: 'good',
  blocked: 'bad',
}

/**
 * The client's view of their own engagement.
 *
 * Everything here is read through the *client's* session, not a service key, so RLS
 * is what decides what appears. A signed-in stranger sees the empty state below
 * rather than anyone's data — the page does no filtering of its own that the database
 * is not already doing.
 */
export default async function PortalPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: me }, { data: clients }] = await Promise.all([
    supabase.from('client_users').select('name, title').limit(1).maybeSingle(),
    supabase.from('clients').select('*, orgs(name)'),
  ])

  const client = (clients ?? [])[0] as { id: string; orgs: { name: string } | null } | undefined

  if (!client) {
    return (
      <div className="card">
        <div className="card-b" style={{ textAlign: 'center', padding: 40 }}>
          <h1 className="h1" style={{ fontSize: 20 }}>Nothing here yet</h1>
          <p style={{ color: 'var(--muted)', marginTop: 8 }}>
            You are signed in as {user?.email}, but this address is not connected to an
            engagement. If that seems wrong, reply to the email that invited you.
          </p>
          <div style={{ marginTop: 18 }}>
            <SignOutButton />
          </div>
        </div>
      </div>
    )
  }

  const [{ data: engagements }, { data: phases }, { data: deliverables }, { data: invoices }] =
    await Promise.all([
      supabase.from('engagements').select('*'),
      supabase.from('engagement_phases').select('*').order('position'),
      supabase.from('deliverables').select('*').order('position'),
      supabase.from('invoices').select('*').order('issued_on', { ascending: false }),
    ])

  const phaseRows = (phases ?? []) as {
    id: string
    engagement_id: string
    name: string
    brief_md: string
    status: string
    target_on: string | null
    verified_at: string | null
    verify_note: string | null
    amount_cents: number
  }[]

  const deliverableRows = (deliverables ?? []) as {
    id: string
    phase_id: string
    name: string
    detail: string | null
    status: string
  }[]

  const invoiceRows = (invoices ?? []) as {
    id: string
    number: string
    description: string | null
    amount_cents: number
    status: string
    issued_on: string | null
    due_on: string | null
  }[]

  return (
    <>
      <div className="row between center wrap" style={{ gap: 10 }}>
        <div>
          <div className="eyebrow">Your portal</div>
          <h1 className="h1">{client.orgs?.name ?? 'Your engagement'}</h1>
          <p className="lede">
            {me?.name ? `Signed in as ${me.name}. ` : ''}
            A phase closes when you mark it verified live — that is what releases its
            invoice, so nothing is billed before you say it works.
          </p>
        </div>
        <SignOutButton />
      </div>

      {(engagements ?? []).map((e: { id: string; name: string }) => {
        const mine = phaseRows.filter((p) => p.engagement_id === e.id)
        return (
          <div key={e.id} style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 17, fontFamily: 'var(--serif)' }}>{e.name}</h2>

            {mine.map((p) => (
              <div key={p.id} className="card" style={{ marginTop: 12 }}>
                <div className="card-h between">
                  <div className="row center" style={{ gap: 9 }}>
                    <h3>{p.name}</h3>
                    <span className={`tag ${PHASE_TAG[p.status] ?? 'hold'}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {p.target_on ? `target ${p.target_on}` : ''}
                  </span>
                </div>
                <div className="card-b">
                  {p.brief_md && (
                    <div
                      style={{ marginBottom: 14 }}
                      dangerouslySetInnerHTML={{ __html: mdToHtml(p.brief_md) }}
                    />
                  )}

                  {deliverableRows.filter((d) => d.phase_id === p.id).length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      {deliverableRows
                        .filter((d) => d.phase_id === p.id)
                        .map((d) => (
                          <div
                            key={d.id}
                            className="row center"
                            style={{ gap: 9, padding: '6px 0' }}
                          >
                            <span style={{ color: d.status === 'done' || d.status === 'accepted' ? 'var(--good)' : 'var(--muted)' }}>
                              {d.status === 'done' || d.status === 'accepted' ? '✓' : '○'}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{d.name}</div>
                              {d.detail && (
                                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{d.detail}</div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {p.verified_at ? (
                    <div className="tag good">
                      ✓ You marked this verified live on {p.verified_at.slice(0, 10)}
                      {p.verify_note ? ` — “${p.verify_note}”` : ''}
                    </div>
                  ) : p.status === 'in_review' ? (
                    <VerifyPanel phaseId={p.id} phaseName={p.name} />
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: 12.5 }}>
                      We will let you know when this is ready for you to check.
                    </p>
                  )}
                </div>
              </div>
            ))}

            {mine.length === 0 && (
              <p style={{ color: 'var(--muted)', marginTop: 10 }}>No phases planned yet.</p>
            )}
          </div>
        )
      })}

      {invoiceRows.length > 0 && (
        <div className="card" style={{ marginTop: 26 }}>
          <div className="card-h"><h3>Invoices</h3></div>
          <table>
            <thead>
              <tr>
                <th>Number</th>
                <th>For</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoiceRows.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.number}</td>
                  <td>{i.description ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{i.issued_on ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{i.due_on ?? '—'}</td>
                  <td>
                    <span className={`tag ${i.status === 'paid' ? 'good' : i.status === 'overdue' ? 'bad' : 'info'}`}>
                      {i.status}
                    </span>
                  </td>
                  <td className="mono" style={{ textAlign: 'right' }}>{formatMoney(i.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
