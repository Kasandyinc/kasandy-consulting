'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PageMeta, SiteSettings } from '@/lib/cms/seo'
import { savePageMeta, saveSiteSettings } from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

export default function SeoEditor({ pages, settings }: { pages: PageMeta[]; settings: SiteSettings }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, text: res.ok ? okText : res.error ?? 'Failed.' })
      router.refresh()
    })

  return (
    <>
      <TrackingPanel settings={settings} pending={pending} run={run} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h between">
          <h3>Page metadata</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {pages.length} pages
          </span>
        </div>
        <table>
          <thead>
            <tr><th>Path</th><th>Title</th><th>Indexed</th><th></th></tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr key={p.path}>
                <td className="mono" style={{ fontSize: 12 }}>{p.path}</td>
                <td>{p.title ?? <span style={{ color: 'var(--muted)' }}>— page default —</span>}</td>
                <td>
                  {p.noindex ? <span className="tag bad">noindex</span> : <span className="tag good">indexed</span>}
                </td>
                <td>
                  <button className="btn sm" onClick={() => setOpen(open === p.path ? null : p.path)}>
                    {open === p.path ? 'Close' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {open && (
          <div className="card-b" style={{ borderTop: '1px solid var(--line)' }}>
            <PageForm
              key={open}
              page={pages.find((p) => p.path === open)!}
              pending={pending}
              onSave={(v) => run(() => savePageMeta(v), 'Saved.')}
            />
          </div>
        )}
      </div>

      {flash && (
        <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
      )}
    </>
  )
}

function TrackingPanel({
  settings,
  pending,
  run,
}: {
  settings: SiteSettings
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const [ga4, setGa4] = useState(settings.ga4_id ?? '')
  const [meta, setMeta] = useState(settings.meta_pixel_id ?? '')
  const [li, setLi] = useState(settings.linkedin_partner_id ?? '')
  const [enabled, setEnabled] = useState(settings.pixels_enabled)
  const [og, setOg] = useState(settings.default_og_image ?? '')
  const [contact, setContact] = useState(settings.contact_email ?? '')

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-h between">
        <h3>Ad pixels &amp; analytics</h3>
        <label className="row center" style={{ gap: 7, cursor: 'pointer' }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>
            {enabled ? 'Loading on public pages' : 'All pixels off'}
          </span>
        </label>
      </div>
      <div className="card-b">
        <div className="row wrap" style={{ gap: 10 }}>
          <div style={{ flex: '1 1 180px' }}>
            <label className="eyebrow" style={{ display: 'block' }}>GA4 measurement ID</label>
            <input value={ga4} onChange={(e) => setGa4(e.target.value)} placeholder="G-XXXXXXXXXX" style={field} />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label className="eyebrow" style={{ display: 'block' }}>Meta pixel ID</label>
            <input value={meta} onChange={(e) => setMeta(e.target.value)} style={field} />
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label className="eyebrow" style={{ display: 'block' }}>LinkedIn partner ID</label>
            <input value={li} onChange={(e) => setLi(e.target.value)} style={field} />
          </div>
        </div>

        <div className="row wrap" style={{ gap: 10, marginTop: 14 }}>
          <div style={{ flex: '2 1 240px' }}>
            <label className="eyebrow" style={{ display: 'block' }}>Default social image</label>
            <input value={og} onChange={(e) => setOg(e.target.value)} placeholder="/images/og-default.jpg" style={field} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="eyebrow" style={{ display: 'block' }}>Public contact email</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} style={field} />
          </div>
        </div>

        <button
          className="btn ox"
          style={{ marginTop: 16 }}
          disabled={pending}
          onClick={() =>
            run(
              () =>
                saveSiteSettings({
                  ga4Id: ga4,
                  metaPixelId: meta,
                  linkedinPartnerId: li,
                  pixelsEnabled: enabled,
                  defaultOgImage: og,
                  contactEmail: contact,
                }),
              'Saved — live on the public site.',
            )
          }
        >
          {pending ? 'Saving…' : 'Save tracking settings'}
        </button>

        <p className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 10 }}>
          These load third-party scripts on visitors&apos; browsers. None of them run on the hub.
        </p>
      </div>
    </div>
  )
}

function PageForm({
  page,
  pending,
  onSave,
}: {
  page: PageMeta
  pending: boolean
  onSave: (v: { path: string; title: string; description: string; ogImage: string; noindex: boolean }) => void
}) {
  const [title, setTitle] = useState(page.title ?? '')
  const [description, setDescription] = useState(page.description ?? '')
  const [ogImage, setOgImage] = useState(page.og_image ?? '')
  const [noindex, setNoindex] = useState(page.noindex)

  return (
    <>
      <div className="eyebrow">{page.path}</div>
      <div style={{ marginTop: 8 }}>
        <label className="eyebrow" style={{ display: 'block' }}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={field} />
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="eyebrow" style={{ display: 'block' }}>
          Description {description.length > 0 && `· ${description.length} chars`}
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...field, resize: 'vertical' }}
        />
        {description.length > 160 && (
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--warn)', marginTop: 4 }}>
            Over 160 characters — search results will truncate it.
          </div>
        )}
      </div>
      <div style={{ marginTop: 10 }}>
        <label className="eyebrow" style={{ display: 'block' }}>Social image</label>
        <input value={ogImage} onChange={(e) => setOgImage(e.target.value)} style={field} />
      </div>
      <label className="row center" style={{ gap: 8, marginTop: 12, cursor: 'pointer' }}>
        <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} />
        <span style={{ fontSize: 13 }}>Hide from search engines</span>
      </label>
      <button
        className="btn ox"
        style={{ marginTop: 14 }}
        disabled={pending}
        onClick={() => onSave({ path: page.path, title, description, ogImage, noindex })}
      >
        Save page
      </button>
    </>
  )
}
