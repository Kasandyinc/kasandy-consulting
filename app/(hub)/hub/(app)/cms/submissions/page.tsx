import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../../_components/ui'
import SubmissionRow from './SubmissionRow'

export const dynamic = 'force-dynamic'

const STATUS_TAG: Record<string, string> = {
  new: 'warn',
  read: 'info',
  actioned: 'good',
  spam: 'bad',
  archived: 'hold',
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: { form?: string; status?: string }
}) {
  const supabase = createClient()

  let query = supabase
    .from('submissions')
    .select('*, orgs(id, name)')
    .order('submitted_at', { ascending: false })
    .limit(200)

  if (searchParams.form) query = query.eq('form_slug', searchParams.form)
  if (searchParams.status) query = query.eq('status', searchParams.status)

  const [{ data, error }, { data: forms }] = await Promise.all([
    query,
    supabase.from('site_forms').select('slug, name'),
  ])

  const rows = (data ?? []) as {
    id: string
    form_slug: string
    name: string | null
    email: string | null
    organisation: string | null
    message: string | null
    status: string
    submitted_at: string
    payload: Record<string, unknown>
    orgs: { id: string; name: string } | null
  }[]

  const newCount = rows.filter((r) => r.status === 'new').length

  return (
    <>
      <Link href="/cms" className="btn sm">← Website CMS</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Website CMS</div>
        <h1 className="h1">Form submissions</h1>
        <p className="lede">
          Everything the public forms have sent, in the platform rather than in a
          notification email. A contact enquiry naming an organisation also creates a
          prospect with an express inbound consent basis.
        </p>
      </div>

      <div className="row wrap" style={{ gap: 6, marginTop: 18 }}>
        <Link href="/cms/submissions" className={`btn sm${!searchParams.form && !searchParams.status ? ' ox' : ''}`}>
          All ({rows.length})
        </Link>
        <Link href="/cms/submissions?status=new" className={`btn sm${searchParams.status === 'new' ? ' ox' : ''}`}>
          New ({newCount})
        </Link>
        {(forms ?? []).map((f: { slug: string; name: string }) => (
          <Link
            key={f.slug}
            href={`/cms/submissions?form=${f.slug}`}
            className={`btn sm${searchParams.form === f.slug ? ' ox' : ''}`}
          >
            {f.name}
          </Link>
        ))}
      </div>

      {error && (
        <div className="err" style={{ marginTop: 18 }}>
          Could not read submissions: {error.message}
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Form</th>
              <th>From</th>
              <th>Message</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>
                  {r.submitted_at.slice(0, 10)}
                </td>
                <td>
                  <span className="tag">{r.form_slug}</span>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.name ?? '—'}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {r.email ?? 'no email on this form'}
                  </div>
                  {r.orgs && (
                    <Link href={`/outreach/${r.orgs.id}`} style={{ fontSize: 11.5 }}>
                      → {r.orgs.name}
                    </Link>
                  )}
                </td>
                <td style={{ maxWidth: 320, fontSize: 12.5 }}>
                  {r.message ? `${r.message.slice(0, 160)}${r.message.length > 160 ? '…' : ''}` : '—'}
                </td>
                <td>
                  <span className={`tag ${STATUS_TAG[r.status] ?? 'hold'}`}>{r.status}</span>
                </td>
                <td>
                  <SubmissionRow id={r.id} status={r.status} email={r.email} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="empty">
                  Nothing here. Historic submissions live in Vercel KV until the
                  migration script is run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SystemStrip>
        Submissions are written by the API routes on the service key, after every spam
        control has passed. No anon policy exists on this table, so a leaked publishable
        key cannot read anybody&apos;s address.
      </SystemStrip>
    </>
  )
}
