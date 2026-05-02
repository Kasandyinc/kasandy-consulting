'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, FileText } from 'lucide-react'

type Download = {
  id: string
  slug: string
  title: string
  description: string
  category: string
  format: string
  filename: string
  enabled: boolean
  createdAt: string
}

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [filenameInput, setFilenameInput] = useState('')

  useEffect(() => {
    fetch('/api/admin/downloads').then(r => r.json()).then(d => { setDownloads(d); setLoading(false) })
  }, [])

  async function update(id: string, patch: Partial<Download>) {
    setSaving(id)
    await fetch('/api/admin/downloads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
    setSaving(null)
    setEditing(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Downloads Manager</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-amber-50 border border-amber-200 px-5 py-4 mb-8 text-sm text-amber-800">
          <p className="font-medium mb-1">How to add a PDF</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Upload the PDF file to <code className="bg-amber-100 px-1">/public/downloads/</code> on the server (or send to your developer to add)</li>
            <li>Enter the exact filename below (e.g. <code className="bg-amber-100 px-1">procurement-checklist.pdf</code>)</li>
            <li>Toggle it <strong>Live</strong> — the download link becomes active immediately and the confirmation email will include the direct link</li>
          </ol>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        <div className="space-y-4">
          {downloads.map(d => (
            <div key={d.id} className="bg-white border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.category}</span>
                      <span className="text-xs text-gray-400">{d.format}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{d.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{d.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Live toggle */}
                  <button
                    onClick={() => update(d.id, { enabled: !d.enabled })}
                    disabled={saving === d.id || !d.filename}
                    title={!d.filename ? 'Add a filename first' : ''}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${d.enabled ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400'}`}
                  >
                    {d.enabled ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {d.enabled ? 'Live' : 'Off'}
                  </button>
                </div>
              </div>

              {/* Filename row */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                {editing === d.id ? (
                  <div className="flex gap-2 items-center">
                    <input
                      autoFocus
                      value={filenameInput}
                      onChange={e => setFilenameInput(e.target.value)}
                      placeholder="e.g. procurement-checklist.pdf"
                      className="flex-1 text-xs border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400"
                    />
                    <button onClick={() => update(d.id, { filename: filenameInput })} disabled={saving === d.id} className="text-xs bg-gray-900 text-white px-3 py-2 hover:bg-gray-700 transition-colors disabled:opacity-50">
                      {saving === d.id ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs border border-gray-200 px-3 py-2 hover:bg-gray-50">Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">File:</span>
                      {d.filename
                        ? <a href={`/downloads/${d.filename}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 underline hover:text-gray-900">{d.filename}</a>
                        : <span className="text-xs text-gray-400 italic">No file linked yet</span>
                      }
                    </div>
                    <button onClick={() => { setEditing(d.id); setFilenameInput(d.filename) }} className="text-xs text-gray-500 hover:text-gray-900 underline">
                      {d.filename ? 'Change' : '+ Add filename'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
