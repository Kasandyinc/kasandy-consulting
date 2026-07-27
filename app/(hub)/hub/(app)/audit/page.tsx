import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

type Entry = {
  id: string
  actor: string | null
  action: string
  entity: string | null
  entity_id: string | null
  meta: Record<string, unknown> | null
  at: string
}

// Refusals and approvals are the entries that matter most, so they read differently
// from routine activity.
function toneFor(action: string): string {
  if (action.includes('refused')) return 'bad'
  if (action.includes('sent') || action.includes('approved')) return 'good'
  if (action.includes('optout')) return 'warn'
  return ''
}

export default async function AuditLog({ searchParams }: { searchParams: { action?: string } }) {
  const supabase = createClient()

  let query = supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(200)
  if (searchParams.action) query = query.eq('action', searchParams.action)

  const [{ data, error }, { data: orgRows }] = await Promise.all([
    query,
    supabase.from('orgs').select('id,name'),
  ])

  const entries = (data ?? []) as Entry[]
  const orgName = new Map((orgRows ?? []).map((o) => [o.id, o.name]))
  const actions = Array.from(new Set(entries.map((e) => e.action))).sort()

  return (
    <>
      <div className="eyebrow">System</div>
      <h1 className="h1">Audit log</h1>
      <p className="lede">
        Every send, every refusal, every sign-off and stage change. Entries are appended
        and never edited — there is no update or delete path, by design.
      </p>

      {error && <div className="err" style={{ marginTop: 18 }}>Could not read the audit log: {error.message}</div>}

      <div className="row wrap" style={{ gap: 8, margin: '18px 0 14px' }}>
        <Link href="/audit" className={`btn sm${!searchParams.action ? ' ox' : ''}`}>All</Link>
        {actions.map((a) => (
          <Link
            key={a}
            href={`/audit?action=${encodeURIComponent(a)}`}
            className={`btn sm${searchParams.action === a ? ' ox' : ''}`}
          >
            {a}
          </Link>
        ))}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>When</th><th>Actor</th><th>Action</th><th>Subject</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const name = e.entity === 'orgs' && e.entity_id ? orgName.get(e.entity_id) : null
              return (
                <tr key={e.id}>
                  <td className="mono" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(e.at).toLocaleString('en-CA', { timeZone: 'America/Vancouver' })}
                  </td>
                  <td style={{ fontSize: 12 }}>{e.actor ?? '—'}</td>
                  <td><span className={`tag ${toneFor(e.action)}`}>{e.action}</span></td>
                  <td style={{ fontSize: 12.5 }}>
                    {name && e.entity_id ? (
                      <Link href={`/outreach/${e.entity_id}`}>{name}</Link>
                    ) : (
                      <span style={{ color: 'var(--muted)' }}>{e.entity ?? '—'}</span>
                    )}
                  </td>
                  <td className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', maxWidth: 420 }}>
                    {e.meta ? JSON.stringify(e.meta) : '—'}
                  </td>
                </tr>
              )
            })}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="empty">Nothing logged yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <SystemStrip>
        Showing the most recent 200 entries. The log is append-only at the database
        level: operators hold an insert policy and nothing else, so history cannot be
        rewritten from the application.
      </SystemStrip>
    </>
  )
}
