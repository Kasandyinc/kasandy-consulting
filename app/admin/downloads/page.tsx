'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle, XCircle, FileText, ExternalLink, Tag, Globe } from 'lucide-react'
import type { Download } from '@/types/downloads'

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingFilename, setEditingFilename] = useState<string | null>(null)
  const [editingSquare, setEditingSquare] = useState<string | null>(null)
  const [filenameInput, setFilenameInput] = useState('')
  const [squareInput, setSquareInput] = useState('')

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
    setEditingFilename(null)
    setEditingSquare(null)
  }

  const freeItems = downloads.filter(d => d.isFree)
  const paidItems = downloads.filter(d => !d.isFree)

  function renderItem(d: Download) {
    const canEnable = d.isFree ? Boolean(d.filename) : Boolean(d.squareUrl && d.filename)

    return (
      <div key={d.id} className="bg-white border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <FileText size={18} className="text-gray-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.category}</span>
                {d.isFree
                  ? <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded">Free</span>
                  : <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1"><Tag size={10} /> {d.price}</span>
                }
                <span className="text-xs text-gray-400">{d.format}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{d.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{d.description}</p>
            </div>
          </div>

          {/* Live toggle */}
          <button
            onClick={() => update(d.id, { enabled: !d.enabled })}
            disabled={saving === d.id || !canEnable}
            title={!canEnable ? (d.isFree ? 'Add a filename first' : 'Add filename and Square URL first') : ''}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 border transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${d.enabled ? 'bg-green-50 border-green-300 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400'}`}
          >
            {d.enabled ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {d.enabled ? 'Live' : 'Off'}
          </button>
        </div>

        {/* Filename + Square URL rows */}
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Filename */}
          <div>
            {editingFilename === d.id ? (
              <div className="flex gap-2 items-center">
                <span className="text-xs text-gray-400 shrink-0">File:</span>
                <input
                  autoFocus
                  value={filenameInput}
                  onChange={e => setFilenameInput(e.target.value)}
                  placeholder="e.g. procurement-checklist.html"
                  className="flex-1 text-xs border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400"
                />
                <button onClick={() => update(d.id, { filename: filenameInput })} disabled={saving === d.id} className="text-xs bg-gray-900 text-white px-3 py-2 hover:bg-gray-700 transition-colors disabled:opacity-50">
                  {saving === d.id ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditingFilename(null)} className="text-xs border border-gray-200 px-3 py-2 hover:bg-gray-50">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">File:</span>
                  {d.filename
                    ? <a href={`/downloads/${d.filename}`} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 underline hover:text-gray-900 flex items-center gap-1">{d.filename} <ExternalLink size={10} /></a>
                    : <span className="text-xs text-gray-400 italic">No file linked yet</span>
                  }
                </div>
                <button onClick={() => { setEditingFilename(d.id); setFilenameInput(d.filename || '') }} className="text-xs text-gray-500 hover:text-gray-900 underline">
                  {d.filename ? 'Change' : '+ Add filename'}
                </button>
              </div>
            )}
          </div>

          {/* Square URL (paid only) */}
          {!d.isFree && (
            <div>
              {editingSquare === d.id ? (
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-gray-400 shrink-0">Square:</span>
                  <input
                    autoFocus
                    value={squareInput}
                    onChange={e => setSquareInput(e.target.value)}
                    placeholder="https://checkout.square.site/..."
                    className="flex-1 text-xs border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400"
                  />
                  <button onClick={() => update(d.id, { squareUrl: squareInput })} disabled={saving === d.id} className="text-xs bg-gray-900 text-white px-3 py-2 hover:bg-gray-700 transition-colors disabled:opacity-50">
                    {saving === d.id ? 'Saving…' : 'Save'}
                  </button>
                  <button onClick={() => setEditingSquare(null)} className="text-xs border border-gray-200 px-3 py-2 hover:bg-gray-50">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={12} className="text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-400">Square:</span>
                    {d.squareUrl
                      ? <a href={d.squareUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-700 underline hover:text-gray-900 truncate max-w-xs flex items-center gap-1">{d.squareUrl} <ExternalLink size={10} /></a>
                      : <span className="text-xs text-amber-600 italic">No checkout URL — required to go live</span>
                    }
                  </div>
                  <button onClick={() => { setEditingSquare(d.id); setSquareInput(d.squareUrl || '') }} className="text-xs text-gray-500 hover:text-gray-900 underline">
                    {d.squareUrl ? 'Change' : '+ Add Square URL'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Downloads Manager</h1>
        </div>
        <a href="/resources" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1">
          View Page <ExternalLink size={11} />
        </a>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Instructions */}
        <div className="bg-amber-50 border border-amber-200 px-5 py-4 mb-8 text-sm text-amber-800">
          <p className="font-medium mb-2">How to activate a product</p>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-semibold mb-1 text-amber-900">FREE downloads</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Confirm filename matches a file in <code className="bg-amber-100 px-1">/public/downloads/</code></li>
                <li>Toggle <strong>Live</strong> — confirmation email will include the direct link</li>
              </ol>
            </div>
            <div>
              <p className="font-semibold mb-1 text-amber-900">PAID products</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>In Square Dashboard, create a checkout link for the product</li>
                <li>Set the Square success redirect to:<br /><code className="bg-amber-100 px-1">kasandyconsulting.com/resources/thank-you?product=[slug]</code></li>
                <li>Paste the Square URL and confirm filename below</li>
                <li>Toggle <strong>Live</strong></li>
              </ol>
            </div>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {/* Free downloads */}
        {freeItems.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">Free Downloads ({freeItems.length})</p>
            <div className="space-y-4">{freeItems.map(renderItem)}</div>
          </div>
        )}

        {/* Paid products */}
        {paidItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">Paid Digital Products ({paidItems.length})</p>
            <div className="space-y-4">{paidItems.map(renderItem)}</div>
          </div>
        )}
      </main>
    </div>
  )
}
