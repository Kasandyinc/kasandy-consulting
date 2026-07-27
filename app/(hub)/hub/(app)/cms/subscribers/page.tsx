import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../../_components/ui'

export const dynamic = 'force-dynamic'

export default async function SubscribersPage() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscribers')
    .select('*')
    .order('subscribed_at', { ascending: false })
    .limit(500)

  const rows = (data ?? []) as {
    id: string
    email: string
    name: string | null
    consent_basis: string
    consent_source: string | null
    subscribed_at: string
    unsubscribed_at: string | null
    unsubscribe_source: string | null
  }[]

  const active = rows.filter((r) => !r.unsubscribed_at)

  return (
    <>
      <Link href="/cms" className="btn sm">← Website CMS</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Website CMS</div>
        <h1 className="h1">Subscribers</h1>
        <p className="lede">
          The Kasandy Brief list, with each person&apos;s lawful basis recorded beside
          them. An opt-out is permanent — the database refuses to clear one, so no
          import or form post can quietly put somebody back.
        </p>
      </div>

      <div className="grid g3" style={{ marginTop: 18 }}>
        <div className="stat g">
          <div className="n">{active.length}</div>
          <div className="l">Active</div>
        </div>
        <div className="stat">
          <div className="n">{rows.length - active.length}</div>
          <div className="l">Opted out</div>
        </div>
        <div className="stat i">
          <div className="n">{rows.length}</div>
          <div className="l">On record</div>
        </div>
      </div>

      {error && (
        <div className="err" style={{ marginTop: 18 }}>Could not read subscribers: {error.message}</div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h between">
          <h3>List</h3>
          <a
            className="btn sm"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(
              ['email,name,basis,subscribed,unsubscribed']
                .concat(
                  active.map((r) =>
                    [r.email, r.name ?? '', r.consent_basis, r.subscribed_at.slice(0, 10), ''].join(','),
                  ),
                )
                .join('\n'),
            )}`}
            download="kasandy-subscribers-active.csv"
          >
            Export active
          </a>
        </div>
        <table>
          <thead>
            <tr><th>Email</th><th>Name</th><th>Basis</th><th>Since</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 12 }}>{r.email}</td>
                <td>{r.name ?? '—'}</td>
                <td>
                  <span className="tag">{r.consent_basis}</span>
                  {r.consent_source && (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                      {r.consent_source}
                    </div>
                  )}
                </td>
                <td className="mono" style={{ fontSize: 11.5 }}>{r.subscribed_at.slice(0, 10)}</td>
                <td>
                  {r.unsubscribed_at ? (
                    <span className="tag bad">out {r.unsubscribed_at.slice(0, 10)}</span>
                  ) : (
                    <span className="tag good">active</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="empty">
                  Nobody yet. Existing subscribers live in Vercel KV until the migration
                  script is run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SystemStrip>
        The export includes active subscribers only — an opted-out address should never
        leave this screen in a file someone might later paste into a sending tool.
      </SystemStrip>
    </>
  )
}
