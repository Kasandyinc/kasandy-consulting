import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { spamControlStatus } from '@/lib/spam'
import { SystemStrip } from '../../../../_components/ui'

export const dynamic = 'force-dynamic'

/**
 * Which spam controls are actually running.
 *
 * Every control fails open when it is not configured — that keeps the site working
 * while keys are being set up, but it also means a missing environment variable
 * silently removes protection with no signal anywhere. This page is that signal.
 */
export default async function SpamPage() {
  const supabase = createClient()
  const controls = spamControlStatus()

  const [{ data: recent }, { count: quarantined }] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, form_slug, name, email, submitted_at, status, payload')
      .order('submitted_at', { ascending: false })
      .limit(40),
    supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'spam'),
  ])

  const rows = (recent ?? []) as {
    id: string
    form_slug: string
    name: string | null
    email: string | null
    submitted_at: string
    status: string
    payload: Record<string, unknown>
  }[]

  const held = rows.filter((r) => Array.isArray(r.payload?._quarantined))
  const inactive = controls.filter((c) => !c.active)

  return (
    <>
      <Link href="/cms" className="btn sm">← Website CMS</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Website CMS</div>
        <h1 className="h1">Spam controls</h1>
        <p className="lede">
          Six controls guard the public forms. Each one fails open when it is not
          configured, so this page exists to show which are actually running.
        </p>
      </div>

      {inactive.length > 0 && (
        <div className="err" style={{ marginTop: 18 }}>
          <strong>{inactive.length} control{inactive.length === 1 ? ' is' : 's are'} not running.</strong>{' '}
          Submissions are passing that check without being examined.
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h"><h3>Status</h3></div>
        <table>
          <thead>
            <tr><th>Control</th><th>State</th><th>What that means</th></tr>
          </thead>
          <tbody>
            {controls.map((c) => (
              <tr key={c.control}>
                <td style={{ fontWeight: 600 }}>{c.control}</td>
                <td>
                  {c.active ? (
                    <span className="tag good">running</span>
                  ) : (
                    <span className="tag bad">not configured</span>
                  )}
                </td>
                <td style={{ fontSize: 12.5, color: c.active ? 'var(--muted)' : 'var(--bad)' }}>{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h between">
          <h3>Quarantined</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {quarantined ?? 0} marked spam · {held.length} held in the last 40
          </span>
        </div>
        <div className="card-b">
          <p style={{ color: 'var(--muted)', fontSize: 12.5, marginBottom: held.length ? 14 : 0 }}>
            A quarantined submission is stored but sends no email — not to Jackee, and
            not to the address given, which is very likely somebody else&apos;s. It takes
            two fields reading as machine-generated to hold one, so an unusual name on
            its own never triggers it. Check these: anything real here is a false
            positive worth telling me about.
          </p>
          {held.map((r) => (
            <div key={r.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
              <div className="row between center wrap" style={{ gap: 8 }}>
                <div>
                  <strong>{r.name ?? '—'}</strong>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                    {r.email ?? 'no email'}
                  </span>
                </div>
                <span className="tag">{r.form_slug}</span>
              </div>
              <div className="prov">
                {(r.payload._quarantined as string[]).join(' · ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      <SystemStrip>
        Content scoring quarantines, it never deletes. A submission held here is in the
        database and in the legacy KV store; only the notifications were suppressed.
      </SystemStrip>
    </>
  )
}
