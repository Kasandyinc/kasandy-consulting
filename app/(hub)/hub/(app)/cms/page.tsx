import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { rowToConfig } from '@/lib/forms/config'
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

  const [{ data: formRows, error }, { count: newSubs }, { count: subscribers }, { count: posts }] =
    await Promise.all([
      supabase.from('site_forms').select('*').order('slug'),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('subscribers').select('id', { count: 'exact', head: true }).is('unsubscribed_at', null),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    ])

  const forms = (formRows ?? []).map(rowToConfig)

  return (
    <>
      <div className="eyebrow">Website CMS</div>
      <h1 className="h1">kasandyconsulting.com</h1>
      <p className="lede">
        The public site, managed here. Forms, what they collect, what people have sent,
        who is on the list, the writing, and the metadata search engines read.
      </p>

      <div className="grid g4" style={{ marginTop: 20 }}>
        <Link href="/cms/submissions?status=new" className="stat w" style={{ display: 'block' }}>
          <div className="n">{newSubs ?? 0}</div>
          <div className="l">New submissions</div>
        </Link>
        <Link href="/cms/subscribers" className="stat g" style={{ display: 'block' }}>
          <div className="n">{subscribers ?? 0}</div>
          <div className="l">Active subscribers</div>
        </Link>
        <Link href="/cms/content" className="stat i" style={{ display: 'block' }}>
          <div className="n">{posts ?? 0}</div>
          <div className="l">Published pieces</div>
        </Link>
        <Link href="/cms/seo" className="stat p" style={{ display: 'block' }}>
          <div className="n">{forms.length}</div>
          <div className="l">Forms managed</div>
        </Link>
      </div>

      {error && (
        <div className="err" style={{ marginTop: 18 }}>
          Could not read site_forms: {error.message}
        </div>
      )}

      {!error && forms.length === 0 && (
        <div className="err" style={{ marginTop: 18 }}>
          No forms found. Run migration{' '}
          <span className="mono">20260727000006_composer_and_forms.sql</span> to seed them.
        </div>
      )}

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-h"><h3>Forms</h3></div>
        <table>
          <thead>
            <tr><th>Form</th><th>Where</th><th>Fields</th><th>Button</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {forms.map((form) => (
              <tr key={form.slug}>
                <td>
                  <div style={{ fontWeight: 600 }}>{form.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{form.slug}</div>
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
                  <Link href={`/cms/${form.slug}`} className="btn sm">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid g3" style={{ marginTop: 16 }}>
        <Panel
          href="/cms/submissions"
          title="Submissions"
          body="Everything the forms have sent. A contact enquiry naming an organisation also becomes a prospect."
        />
        <Panel
          href="/cms/subscribers"
          title="Subscribers"
          body="The Kasandy Brief list, with each person's lawful basis. Opt-outs are permanent."
        />
        <Panel
          href="/cms/content"
          title="Blog & whitepapers"
          body="Articles and gated whitepapers, with their own SEO fields."
        />
      </div>

      <SystemStrip>
        The public site reads active forms, published posts and page metadata through
        tagged caches that a save here invalidates — so an edit is live at once without
        a database round-trip per visitor. Compiled defaults keep the site rendering if
        this database is unreachable.
      </SystemStrip>
    </>
  )
}

function Panel({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="card" style={{ display: 'block' }}>
      <div className="card-b">
        <div style={{ fontWeight: 600, marginBottom: 5 }}>{title} →</div>
        <div style={{ color: 'var(--muted)', fontSize: 12.5, lineHeight: 1.5 }}>{body}</div>
      </div>
    </Link>
  )
}
