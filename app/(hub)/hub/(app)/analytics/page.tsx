import { createClient } from '@/lib/supabase/server'
import { STAGE_LABEL, BOARD_STAGES, type Stage } from '@/lib/engine/types'
import { formatMoney, summarise, type Invoice, type Payment } from '@/lib/engine/money'
import { SystemStrip } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

function pct(n: number, d: number): string {
  if (d === 0) return '—'
  return `${Math.round((n / d) * 100)}%`
}

export default async function AnalyticsPage() {
  const supabase = createClient()

  const [{ data: orgs }, { data: sends }, { data: sequences }, { data: invoices }, { data: payments }, { data: bookings }] =
    await Promise.all([
      supabase.from('orgs').select('id, name, stage, segment, province, black_led, hold, replied_at, outreach_approved'),
      supabase.from('sends').select('id, org_id, template_id, created_at'),
      supabase.from('sequences').select('id, org_id, status'),
      supabase.from('invoices').select('*'),
      supabase.from('payments').select('*'),
      supabase.from('bookings').select('id, status, source, starts_at'),
    ])

  const orgRows = (orgs ?? []) as {
    id: string
    name: string
    stage: Stage
    segment: string | null
    province: string | null
    black_led: boolean
    hold: boolean
    replied_at: string | null
  }[]

  const sendRows = (sends ?? []) as { org_id: string; template_id: string | null }[]
  const bookingRows = (bookings ?? []) as { status: string; source: string }[]
  const money = summarise((invoices ?? []) as Invoice[], (payments ?? []) as Payment[])

  // Funnel counts are cumulative: an org at "sent" has also been researched.
  const stageIndex = (s: Stage) => Number(s.split('_')[0])
  const reached = (s: Stage) => orgRows.filter((o) => stageIndex(o.stage) >= stageIndex(s)).length

  const contacted = new Set(sendRows.map((s) => s.org_id)).size
  const replied = orgRows.filter((o) => o.replied_at).length
  const booked = bookingRows.filter((b) => b.status !== 'cancelled').length
  const held = bookingRows.filter((b) => b.status === 'done').length

  const bySegment = Object.entries(
    orgRows.reduce<Record<string, number>>((acc, o) => {
      const k = o.segment ?? 'Unsegmented'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  const byTemplate = Object.entries(
    sendRows.reduce<Record<string, number>>((acc, s) => {
      const k = s.template_id ?? 'unknown'
      acc[k] = (acc[k] ?? 0) + 1
      return acc
    }, {}),
  ).sort((a, b) => b[1] - a[1])

  return (
    <>
      <div className="eyebrow">Measure</div>
      <h1 className="h1">Analytics</h1>
      <p className="lede">
        Counted from the platform&apos;s own records — sends, replies, bookings and
        payments — not from a tracking pixel. The hub carries no analytics scripts.
      </p>

      <div className="grid g4" style={{ marginTop: 20 }}>
        <div className="stat">
          <div className="n">{orgRows.length}</div>
          <div className="l">Prospects</div>
        </div>
        <div className="stat i">
          <div className="n">{contacted}</div>
          <div className="l">Contacted · {pct(contacted, orgRows.length)}</div>
        </div>
        <div className="stat g">
          <div className="n">{replied}</div>
          <div className="l">Replied · {pct(replied, contacted)} of contacted</div>
        </div>
        <div className="stat w">
          <div className="n">{held}</div>
          <div className="l">Calls held</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="card">
          <div className="card-h"><h3>Conversion funnel</h3></div>
          <div className="card-b">
            {BOARD_STAGES.map((s) => {
              const n = reached(s)
              const width = orgRows.length ? Math.max(2, (n / orgRows.length) * 100) : 0
              return (
                <div key={s} style={{ marginBottom: 11 }}>
                  <div className="row between" style={{ fontSize: 12.5, marginBottom: 4 }}>
                    <span>{STAGE_LABEL[s]}</span>
                    <span className="mono">
                      {n} · {pct(n, orgRows.length)}
                    </span>
                  </div>
                  <div style={{ background: 'var(--line)', borderRadius: 4, height: 8 }}>
                    <div
                      style={{
                        width: `${width}%`,
                        background: 'var(--ox)',
                        height: 8,
                        borderRadius: 4,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            <div className="prov" style={{ marginTop: 10 }}>
              cumulative — an org at Sent has also been Researched
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Outreach performance</h3></div>
          <table>
            <thead>
              <tr><th>Step</th><th>Sends</th><th>Share</th></tr>
            </thead>
            <tbody>
              {byTemplate.map(([id, n]) => (
                <tr key={id}>
                  <td className="mono">{id}</td>
                  <td>{n}</td>
                  <td>{pct(n, sendRows.length)}</td>
                </tr>
              ))}
              {byTemplate.length === 0 && (
                <tr><td colSpan={3} className="empty">Nothing sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h"><h3>Segment analysis</h3></div>
          <table>
            <thead>
              <tr><th>Segment</th><th>Prospects</th><th>Contacted</th></tr>
            </thead>
            <tbody>
              {bySegment.map(([seg, n]) => {
                const ids = new Set(orgRows.filter((o) => (o.segment ?? 'Unsegmented') === seg).map((o) => o.id))
                const touched = new Set(sendRows.filter((s) => ids.has(s.org_id)).map((s) => s.org_id)).size
                return (
                  <tr key={seg}>
                    <td>{seg}</td>
                    <td>{n}</td>
                    <td>{touched} · {pct(touched, n)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h"><h3>Revenue &amp; delivery</h3></div>
          <div className="card-b">
            <Row label="Invoiced" value={formatMoney(money.invoicedCents)} />
            <Row label="Collected" value={formatMoney(money.collectedCents)} />
            <Row label="Outstanding" value={formatMoney(money.outstandingCents)} />
            <Row label="Overdue" value={formatMoney(money.overdueCents)} />
            <div style={{ borderTop: '1px solid var(--line)', margin: '12px 0', paddingTop: 12 }}>
              <Row label="Bookings" value={String(booked)} />
              <Row label="Held" value={`${held} · ${pct(held, booked)}`} />
              <Row
                label="Reply rate"
                value={pct(replied, contacted)}
              />
            </div>
          </div>
        </div>
      </div>

      <SystemStrip>
        Every figure here is a count over rows this platform wrote. Nothing is sampled,
        modelled or inferred, and no third-party analytics run on the hub.
      </SystemStrip>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between" style={{ padding: '5px 0' }}>
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{label}</span>
      <span className="mono" style={{ fontWeight: 600, fontSize: 13 }}>{value}</span>
    </div>
  )
}
