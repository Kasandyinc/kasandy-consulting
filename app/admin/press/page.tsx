'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type PressItem = {
  id: string
  outlet: string
  title: string
  url: string
  summary: string
  category: string
  date?: string
  featured: boolean
  createdAt: string
}

const CATEGORIES = [
  'Print / Online',
  'TV / Online',
  'TV / Radio / Online',
  'Magazine / Online',
  'Magazine',
  'Recognition',
  'Online',
]

const emptyForm = {
  outlet: '',
  title: '',
  url: '',
  summary: '',
  category: 'Print / Online',
  date: '',
  featured: false,
}

export default function AdminPress() {
  const [items, setItems] = useState<PressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/press')
    const data = await r.json()
    setItems(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startAdd() {
    setEditingId(null)
    setForm(emptyForm)
    setShowAddForm(true)
  }

  function startEdit(item: PressItem) {
    setShowAddForm(false)
    setEditingId(item.id)
    setForm({
      outlet: item.outlet,
      title: item.title,
      url: item.url,
      summary: item.summary,
      category: item.category,
      date: item.date ?? '',
      featured: item.featured,
    })
  }

  function cancelForm() {
    setShowAddForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editingId) {
      await fetch('/api/admin/press', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, ...form }),
      })
    } else {
      await fetch('/api/admin/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    }
    setSaving(false)
    cancelForm()
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this press item?')) return
    await fetch('/api/admin/press', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  async function handleToggleFeatured(item: PressItem) {
    await fetch('/api/admin/press', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, featured: !item.featured }),
    })
    load()
  }

  const inputCls = 'w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400'
  const btnPrimary = 'text-xs bg-gray-900 text-white px-3 py-1.5 hover:bg-gray-700 transition-colors'
  const btnSecondary = 'text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Press & Media</h1>
        </div>
        <button onClick={startAdd} className={btnPrimary}>+ Add Coverage</button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-6">

        {/* Add / Edit Form */}
        {(showAddForm || editingId) && (
          <div className="bg-white border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-5">
              {editingId ? 'Edit Press Item' : 'Add Press Coverage'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Outlet *</label>
                  <input required className={inputCls} value={form.outlet}
                    onChange={e => setForm(f => ({ ...f, outlet: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category *</label>
                  <select required className={inputCls} value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Title *</label>
                <input required className={inputCls} value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL *</label>
                <input required type="url" className={inputCls} value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Summary *</label>
                <textarea required rows={3} className={inputCls} value={form.summary}
                  onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date (optional, e.g. "May 30, 2024")</label>
                  <input className={inputCls} value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.featured}
                      onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                    Featured (shown in highlighted section)
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className={btnPrimary}>
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Item'}
                </button>
                <button type="button" onClick={cancelForm} className={btnSecondary}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="bg-white border border-gray-200">
          {loading ? (
            <p className="text-xs text-gray-400 p-6">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-gray-400 p-6">No press items yet. Add your first above.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map(item => (
                <div key={item.id} className="px-6 py-4">
                  {editingId === item.id ? null : (
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold tracking-widest uppercase text-amber-700">{item.outlet}</span>
                          <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5">{item.category}</span>
                          {item.featured && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5">Featured</span>
                          )}
                          {item.date && <span className="text-[10px] text-gray-400">{item.date}</span>}
                        </div>
                        <p className="text-sm text-gray-900 leading-snug truncate">{item.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.summary}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => handleToggleFeatured(item)} className={btnSecondary}>
                          {item.featured ? 'Unfeature' : 'Feature'}
                        </button>
                        <button onClick={() => startEdit(item)} className={btnSecondary}>Edit</button>
                        <button onClick={() => handleDelete(item.id)}
                          className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
