'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SubEntry = { id: string; email: string; resource?: string; createdAt: string }
type Tab = 'newsletter' | 'downloads'

function fmt(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { timeZone: 'America/Vancouver', month: 'short', day: 'numeric', year: 'numeric' })
}

export default function SubscribersPage() {
  const [tab, setTab] = useState<Tab>('newsletter')
  const [data, setData] = useState<{ newsletter: SubEntry[]; downloads: SubEntry[] } | null>(null)

  useEffect(() => {
    fetch('/api/admin/subscribers').then(r => r.json()).then(setData)
  }, [])

  function exportCsv(rows: SubEntry[], filename: string) {
    const header = 'Email,Resource,Date\n'
    const body = rows.map(r => `${r.email},"${r.resource || ''}","${fmt(r.createdAt)}"`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Subscribers & Leads</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {!data && <p className="text-sm text-gray-400">Loading…</p>}

        {data && (
          <>
            <div className="flex gap-1 mb-8 border-b border-gray-200">
              {([
                { key: 'newsletter' as Tab, label: 'Newsletter Subscribers', count: data.newsletter.length },
                { key: 'downloads' as Tab, label: 'Resource Downloads', count: data.downloads.length },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {t.label}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
                </button>
              ))}
            </div>

            {tab === 'newsletter' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">{data.newsletter.length} subscriber{data.newsletter.length !== 1 ? 's' : ''}</p>
                  {data.newsletter.length > 0 && (
                    <button onClick={() => exportCsv(data.newsletter, 'newsletter-subscribers.csv')} className="text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors">Export CSV</button>
                  )}
                </div>
                {data.newsletter.length === 0 && <p className="text-sm text-gray-400">No newsletter subscribers yet.</p>}
                <div className="bg-white border border-gray-200 divide-y divide-gray-100">
                  {data.newsletter.map((s, i) => (
                    <div key={s.id || i} className="flex items-center justify-between px-5 py-3">
                      <span className="text-sm text-gray-800">{s.email}</span>
                      <span className="text-xs text-gray-400">{fmt(s.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'downloads' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">{data.downloads.length} download{data.downloads.length !== 1 ? 's' : ''}</p>
                  {data.downloads.length > 0 && (
                    <button onClick={() => exportCsv(data.downloads, 'resource-downloads.csv')} className="text-xs border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors">Export CSV</button>
                  )}
                </div>
                {data.downloads.length === 0 && <p className="text-sm text-gray-400">No resource downloads yet.</p>}
                <div className="bg-white border border-gray-200 divide-y divide-gray-100">
                  {data.downloads.map((s, i) => (
                    <div key={s.id || i} className="flex items-center justify-between px-5 py-3 gap-4">
                      <span className="text-sm text-gray-800">{s.email}</span>
                      <span className="text-xs text-gray-500 truncate max-w-[220px]">{s.resource}</span>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(s.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
