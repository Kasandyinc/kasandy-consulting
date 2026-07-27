import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  formatMoney,
  summarise,
  balanceCents,
  daysOverdue,
  agingBucket,
  dunningLevel,
  type Invoice,
  type Payment,
} from '@/lib/engine/money'
import { SystemStrip } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

type QboRow = { entity: string; entity_id: string; status: string; note: string | null; checked_at: string }

export default async function Financials() {
  const supabase = createClient()

  const [invoiceRes, paymentRes, qboRes, settingsRes, clientRes] = await Promise.all([
    supabase.from('invoices').select('*').order('issued_on', { ascending: false, nullsFirst: false }),
    supabase.from('payments').select('*').order('received_on', { ascending: false }),
    supabase.from('qbo_sync').select('*').neq('status', 'matched').order('checked_at', { ascending: false }),
    supabase.from('settings').select('*').maybeSingle(),
    supabase.from('clients').select('id, orgs(name)'),
  ])

  const invoices = (invoiceRes.data ?? []) as Invoice[]
  const payments = (paymentRes.data ?? []) as Payment[]
  const unmatched = (qboRes.data ?? []) as QboRow[]
  const settings = settingsRes.data as
    | { square_location_id: string | null; square_env: string; annual_revenue_goal_cents: number | null }
    | null

  const s = summarise(invoices, payments)
  const goal = settings?.annual_revenue_goal_cents ?? 0
  const goalPct = goal > 0 ? Math.min(100, Math.round((s.collectedCents / goal) * 100)) : 0

  const clientName = new Map(
    (clientRes.data ?? []).map((c: { id: string; orgs: { name: string } | { name: string }[] | null }) => [
      c.id,
      Array.isArray(c.orgs) ? c.orgs[0]?.name : c.orgs?.name,
    ]),
  )

  return (
    <>
      <div className="eyebrow">Money</div>
      <h1 className="h1">Financials</h1>
      <p className="lede">
        Invoices, payments, and reconciliation against QuickBooks. Deposits and
        milestone billing run on the Kasandy Consulting Square account only.
      </p>

      {/* Configuration state is worth showing plainly: the location lock is what
          keeps this ledger separate from BEBC. */}
      {!settings?.square_location_id && (
        <div className="err" style={{ marginTop: 18 }}>
          <strong>Square is not connected yet.</strong> Until{' '}
          <code>settings.square_location_id</code> holds the Kasandy Consulting
          location, the database refuses to record any Square payment — a payment from
          the wrong account cannot land here by accident.
        </div>
      )}

      <div className="grid g4" style={{ marginTop: 22 }}>
        <div className="stat">
          <div className="n">{formatMoney(s.invoicedCents)}</div>
          <div className="l">Invoiced</div>
        </div>
        <div className="stat g">
          <div className="n">{formatMoney(s.collectedCents)}</div>
          <div className="l">Collected</div>
        </div>
        <div className="stat i">
          <div className="n">{formatMoney(s.outstandingCents)}</div>
          <div className="l">Outstanding</div>
        </div>
        <div className="stat w">
          <div className="n">{formatMoney(s.overdueCents)}</div>
          <div className="l">Overdue</div>
        </div>
      </div>

      {goal > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-h between">
            <h3>Annual revenue goal</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {formatMoney(s.collectedCents)} of {formatMoney(goal)}
            </span>
          </div>
          <div className="card-b">
            <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', height: 14, borderRadius: 7 }}>
              <div style={{ width: `${goalPct}%`, background: 'var(--ox)', height: '100%', borderRadius: 7 }} />
            </div>
            <p style={{ marginTop: 8, color: 'var(--muted)', fontSize: 12.5 }}>{goalPct}% collected</p>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-h between">
          <h3>Invoices</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{invoices.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Number</th><th>Client</th><th>Amount</th><th>Balance</th>
              <th>Status</th><th>Due</th><th>Aging</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => {
              const level = dunningLevel(i)
              return (
                <tr key={i.id}>
                  <td className="mono" style={{ fontSize: 12 }}>{i.number}</td>
                  <td>{clientName.get(i.client_id) ?? '—'}</td>
                  <td>{formatMoney(i.amount_cents, i.currency)}</td>
                  <td>{formatMoney(balanceCents(i, payments), i.currency)}</td>
                  <td>
                    <span className={`tag ${i.status === 'paid' ? 'good' : i.status === 'void' ? '' : daysOverdue(i) > 0 ? 'bad' : 'warn'}`}>
                      {i.status.replace(/_/g, ' ')}
                    </span>
                    {i.requires_verification && !i.paid_at && (
                      <span className="tag info" style={{ marginLeft: 4 }}>milestone</span>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 11.5 }}>{i.due_on ?? '—'}</td>
                  <td>
                    {agingBucket(i)}
                    {level > 0 && <span className="tag bad" style={{ marginLeft: 6 }}>dunning L{level}</span>}
                  </td>
                </tr>
              )
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  No invoices. There are no signed engagements yet — billing begins when
                  Phase 3 produces one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid g2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><h3>Payment history</h3></div>
          <table>
            <thead>
              <tr><th>Received</th><th>Method</th><th>Amount</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="mono" style={{ fontSize: 11.5 }}>{p.received_on}</td>
                  <td><span className="tag">{p.method.replace(/_/g, '-')}</span></td>
                  <td>{formatMoney(p.amount_cents, p.currency)}</td>
                  <td className="mono" style={{ fontSize: 11 }}>
                    {p.reference ?? p.square_location_id ?? '—'}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={4} className="empty">No payments recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h between">
            <h3>QBO reconciliation</h3>
            <span className={`tag ${unmatched.length ? 'warn' : 'good'}`}>
              {unmatched.length ? `${unmatched.length} unmatched` : 'clean'}
            </span>
          </div>
          <div className="card-b">
            {unmatched.length === 0 ? (
              <p className="empty" style={{ padding: 0 }}>
                Nothing unmatched. The nightly job records every record it checks, so an
                empty list means checked-and-matched, not unchecked.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', display: 'grid', gap: 8 }}>
                {unmatched.map((r) => (
                  <li key={`${r.entity}-${r.entity_id}`} className="row between">
                    <span className="mono" style={{ fontSize: 11.5 }}>{r.entity} · {r.entity_id.slice(0, 8)}</span>
                    <span className="tag bad">{r.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <SystemStrip>
        Square environment: <b>{settings?.square_env ?? 'sandbox'}</b>. A payment is
        refused at the database unless it comes from the configured Kasandy Consulting
        location, so the BEBC account cannot feed this ledger. An invoice that bills a
        milestone cannot be issued until the client marks the phase verified.{' '}
        <Link href="/audit">Audit log →</Link>
      </SystemStrip>
    </>
  )
}
