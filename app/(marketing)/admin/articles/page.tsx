'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Article = {
  id: string
  slug: string
  title: string
  category: string
  excerpt: string
  date: string
  published: boolean
}

export default function AdminArticles() {
  const router = useRouter()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Article>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function load() {
    const data = await fetch('/api/admin/articles').then(r => r.json())
    setArticles(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function togglePublished(id: string, current: boolean) {
    await fetch('/api/admin/articles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, published: !current }),
    })
    load()
  }

  function startEdit(article: Article) {
    setEditing(article.id)
    setEditForm({ title: article.title, excerpt: article.excerpt, category: article.category })
    setSaveStatus('idle')
  }

  function cancelEdit() {
    setEditing(null)
    setEditForm({})
    setSaveStatus('idle')
  }

  async function saveEdit(id: string) {
    setSaveStatus('loading')
    const res = await fetch('/api/admin/articles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...editForm }),
    })
    if (res.ok) {
      setEditing(null)
      setEditForm({})
      setSaveStatus('idle')
      load()
    } else {
      setSaveStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Articles</h1>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-900">Sign Out</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        <div className="mb-6 flex items-center gap-6 text-xs text-gray-500">
          <span>{articles.filter(a => a.published).length} published</span>
          <span>{articles.filter(a => !a.published).length} drafts</span>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && articles.length === 0 && (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No articles found.</p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="space-y-3">
            {articles.map(a => (
              <div key={a.id} className="bg-white border border-gray-200 px-5 py-4">
                {editing === a.id ? (
                  <div className="space-y-3">
                    <input
                      value={editForm.title || ''}
                      onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                      placeholder="Title"
                    />
                    <input
                      value={editForm.category || ''}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400"
                      placeholder="Category"
                    />
                    <textarea
                      value={editForm.excerpt || ''}
                      onChange={e => setEditForm(f => ({ ...f, excerpt: e.target.value }))}
                      rows={3}
                      className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
                      placeholder="Excerpt"
                    />
                    {saveStatus === 'error' && <p className="text-xs text-red-600">Failed to save.</p>}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => saveEdit(a.id)}
                        disabled={saveStatus === 'loading'}
                        className="bg-gray-900 text-white text-xs px-4 py-2 hover:bg-gray-700 disabled:opacity-50"
                      >
                        {saveStatus === 'loading' ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-gray-900">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-[10px] tracking-wide uppercase px-2 py-0.5 ${a.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {a.published ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-[10px] tracking-wide uppercase text-gray-400">{a.category}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">{a.title}</p>
                      <p className="text-xs text-gray-500 line-clamp-2">{a.excerpt}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={() => startEdit(a)}
                        className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => togglePublished(a.id, a.published)}
                        className={`text-xs transition-colors ${a.published ? 'text-gray-500 hover:text-amber-600' : 'text-gray-500 hover:text-green-600'}`}
                      >
                        {a.published ? 'Unpublish' : 'Publish'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
