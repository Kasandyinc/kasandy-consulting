import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { rowToConfig, FORM_DEFAULTS } from '@/lib/forms/config'
import { SystemStrip } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

const WHERE: Record<string, string> = {
  contact: '/contact',
  'kenya-waitlist': '/kenya',
  'speaking-inquiry': '/speaking',
  newsletter: '/resources',
  reviews: '/reviews',
}

export default async function CmsPage() {
  const supabase = createClient()
  const { data, error } = await supabase.from('site_forms').select('*').order('slug')

  const rows = (data ?? []).map(rowToConfig)

  return (
    <>
      <div className="eyebrow">Website CMS</div>
      <h1 className="h1">Forms</h1>
      <p className="lede">
        The labels, options, button wording and thank-you message on every public form.
        Changes go live without a deploy. Spam protection and validation stay in the code —
        this governs what is asked, never whether the answer is trusted.
      </p>

      {error && (
        <div className="err" style={{ marginTop: 18 }}>
          Could not read site_forms: {error.message}
        </div>
      )}

      {!error && rows.length === 0 && (
        <div className="err" style={{ marginTop: 18 }}>
          No forms found. Run migration <span className="mono">20260727000006_composer_and_forms.sql</span>{' '}
          to seed the five live forms.
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Form</th>
              <th>Where</th>
              <th>Fields</th>
              <th>Button</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((form) => (
              <tr key={form.slug}>
                <td>
                  <div style={{ fontWeight: 600 }}>{form.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {form.slug}
                  </div>
                </td>
                <td className="mono" style={{ fontSize: 11.5 }}>{WHERE[form.slug] ?? '—'}</td>
                <td>{form.fields.length}</td>
                <td>{form.submitLabel}</td>
                <td>
                  {form.active ? (
                    <span className="tag good">open</span>
                  ) : (
                    <span className="tag bad">closed</span>
                  )}
                </td>
                <td>
                  <Link href={`/cms/${form.slug}`} className="btn sm">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !error && (
              <tr>
                <td colSpan={6} className="empty">
                  Nothing seeded yet — the site is running on its compiled defaults
                  ({Object.keys(FORM_DEFAULTS).length} forms).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SystemStrip>
        The public site reads active forms through the anon policy and falls back to the
        compiled defaults if this database is unreachable — a form never fails closed
        because the hub is down.
      </SystemStrip>
    </>
  )
}
