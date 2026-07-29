'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { savePost, deletePost } from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

type Post = {
  id: string
  slug: string
  kind: string
  title: string
  excerpt: string | null
  body_md: string
  author: string | null
  tags: string[]
  status: string
  seo_title: string | null
  seo_description: string | null
  gated: boolean
  noindex: boolean
  published_at: string | null
}

const BLANK = {
  id: undefined as string | undefined,
  slug: '',
  kind: 'article',
  title: '',
  excerpt: '',
  bodyMd: '',
  author: 'Jackee Kasandy',
  tags: '',
  status: 'draft',
  seoTitle: '',
  seoDescription: '',
  gated: false,
  noindex: false,
}

export default function ContentEditor({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [draft, setDraft] = useState<typeof BLANK | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, text: res.ok ? okText : res.error ?? 'Failed.' })
      if (res.ok) setDraft(null)
      router.refresh()
    })

  const edit = (p: Post) =>
    setDraft({
      id: p.id,
      slug: p.slug,
      kind: p.kind,
      title: p.title,
      excerpt: p.excerpt ?? '',
      bodyMd: p.body_md,
      author: p.author ?? '',
      tags: p.tags.join(', '),
      status: p.status,
      seoTitle: p.seo_title ?? '',
      seoDescription: p.seo_description ?? '',
      gated: p.gated,
      noindex: p.noindex,
    })

  return (
    <>
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h between">
          <h3>Pieces</h3>
          <button className="btn sm ox" onClick={() => setDraft({ ...BLANK })}>
            + New
          </button>
        </div>
        <table>
          <thead>
            <tr><th>Title</th><th>Kind</th><th>URL</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.title}</div>
                  {p.excerpt && (
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                      {p.excerpt.slice(0, 90)}
                      {p.excerpt.length > 90 ? '…' : ''}
                    </div>
                  )}
                </td>
                <td>
                  <span className="tag">{p.kind}</span>
                  {p.gated && <span className="tag warn" style={{ marginLeft: 5 }}>gated</span>}
                </td>
                <td className="mono" style={{ fontSize: 11.5 }}>/{p.slug}</td>
                <td>
                  <span
                    className={`tag ${p.status === 'published' ? 'good' : p.status === 'archived' ? 'hold' : 'warn'}`}
                  >
                    {p.status}
                  </span>
                  {p.published_at && (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                      {p.published_at.slice(0, 10)}
                    </div>
                  )}
                </td>
                <td>
                  <div className="row" style={{ gap: 5, justifyContent: 'flex-end' }}>
                    <button className="btn sm" onClick={() => edit(p)}>Edit</button>
                    {p.status !== 'published' && (
                      <button
                        className="btn sm"
                        disabled={pending}
                        onClick={() => run(() => deletePost(p.id), 'Deleted.')}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="empty">
                  Nothing written yet. Existing articles live in Vercel KV until the
                  migration script is run.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h between">
            <h3>{draft.id ? 'Edit' : 'New piece'}</h3>
            <button className="btn sm" onClick={() => setDraft(null)}>Close</button>
          </div>
          <div className="card-b">
            <div className="row wrap" style={{ gap: 10 }}>
              <div style={{ flex: '2 1 240px' }}>
                <label className="eyebrow" style={{ display: 'block' }}>Title</label>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} style={field} />
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label className="eyebrow" style={{ display: 'block' }}>Kind</label>
                <select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} style={field}>
                  <option value="article">Article</option>
                  <option value="whitepaper">Whitepaper</option>
                  <option value="page">Page</option>
                </select>
              </div>
              <div style={{ flex: '1 1 140px' }}>
                <label className="eyebrow" style={{ display: 'block' }}>Status</label>
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} style={field}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="row wrap" style={{ gap: 10, marginTop: 12 }}>
              <div style={{ flex: '2 1 200px' }}>
                <label className="eyebrow" style={{ display: 'block' }}>
                  URL slug {draft.id && <span style={{ color: 'var(--warn)' }}>· changing this breaks links</span>}
                </label>
                <input
                  value={draft.slug}
                  placeholder="left blank, generated from the title"
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  style={field}
                />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label className="eyebrow" style={{ display: 'block' }}>Author</label>
                <input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} style={field} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label className="eyebrow" style={{ display: 'block' }}>Tags</label>
                <input value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} style={field} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="eyebrow" style={{ display: 'block' }}>Excerpt</label>
              <textarea
                rows={2}
                value={draft.excerpt}
                onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                style={{ ...field, resize: 'vertical' }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="eyebrow" style={{ display: 'block' }}>Body (Markdown)</label>
              <textarea
                rows={16}
                value={draft.bodyMd}
                onChange={(e) => setDraft({ ...draft, bodyMd: e.target.value })}
                style={{ ...field, fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.6, resize: 'vertical' }}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 14 }}>
              <div className="eyebrow">Search &amp; social</div>
              <div className="row wrap" style={{ gap: 10, marginTop: 8 }}>
                <div style={{ flex: '1 1 240px' }}>
                  <input
                    value={draft.seoTitle}
                    placeholder="SEO title — falls back to the title"
                    onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })}
                    style={field}
                  />
                </div>
                <div style={{ flex: '2 1 300px' }}>
                  <input
                    value={draft.seoDescription}
                    placeholder="Meta description — falls back to the excerpt"
                    onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })}
                    style={field}
                  />
                </div>
              </div>
              <div className="row wrap" style={{ gap: 20, marginTop: 12 }}>
                <label className="row center" style={{ gap: 7, cursor: 'pointer' }}>
                  <input type="checkbox" checked={draft.gated} onChange={(e) => setDraft({ ...draft, gated: e.target.checked })} />
                  <span style={{ fontSize: 13 }}>Gated — needs the download flow</span>
                </label>
                <label className="row center" style={{ gap: 7, cursor: 'pointer' }}>
                  <input type="checkbox" checked={draft.noindex} onChange={(e) => setDraft({ ...draft, noindex: e.target.checked })} />
                  <span style={{ fontSize: 13 }}>Hide from search engines</span>
                </label>
              </div>
            </div>

            <button
              className="btn ox"
              style={{ marginTop: 16 }}
              disabled={pending || !draft.title.trim()}
              onClick={() => run(() => savePost(draft), 'Saved.')}
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {flash && (
        <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
      )}
    </>
  )
}
