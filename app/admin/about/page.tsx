'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type Credential = { label: string; value: string }

type AboutData = {
  credentials: Credential[]
  firmBio: string[]
  jBio: string[]
}

const DEFAULT_CREDENTIALS: Credential[] = [
  { label: 'Experience', value: '25+ years: corporate marketing, entrepreneurship, consulting' },
  { label: 'Corporate', value: 'Cossette | Bensimon Byrne | DDB Canada | BC Ferries | WorkSafeBC' },
  { label: 'Entrepreneurship', value: 'Founder & CEO, Kasandy Inc. (est. 2014) | Granville Island, Vancouver' },
  { label: 'Non-Profit', value: 'Founder & Global President, BEBC Society (est. 2020)' },
  { label: 'Boards', value: 'BC Housing Board Commissioner | Board of Directors, Union Gospel Mission' },
  { label: 'Recognition', value: '"23 Black Leaders in Vancouver" — Vancouver Economic Commission' },
  { label: 'Media', value: 'Montecristo Magazine' },
  { label: 'Programs', value: "Canada's First National Procurement Readiness Course" },
  { label: 'Impact', value: '3,000+ entrepreneurs trained | 17–21 businesses into procurement pipelines' },
  { label: 'Funded by', value: 'ISED Canada | SBCCI | FFBC' },
  { label: 'Partners', value: "Shared Services Canada | Procurement Assistance Canada | Women's Economic Council" },
]

const TABS = ['Credentials', 'Bio'] as const
type Tab = typeof TABS[number]

const inputCls = 'text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400'
const btnPrimary = 'text-xs bg-gray-900 text-white px-3 py-1.5 hover:bg-gray-700 transition-colors'
const btnSecondary = 'text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors'

export default function AdminAbout() {
  const [tab, setTab] = useState<Tab>('Credentials')
  const [credentials, setCredentials] = useState<Credential[]>(DEFAULT_CREDENTIALS)
  const [firmBio, setFirmBio] = useState<string[]>([])
  const [jBio, setJBio] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/about')
      .then(r => r.json())
      .then((d: AboutData | null) => {
        if (d?.credentials && d.credentials.length > 0) setCredentials(d.credentials)
        if (d?.firmBio) setFirmBio(d.firmBio)
        if (d?.jBio) setJBio(d.jBio)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    await fetch('/api/admin/about', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentials, firmBio, jBio }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function addCredential() {
    setCredentials(c => [...c, { label: '', value: '' }])
  }

  function removeCredential(idx: number) {
    setCredentials(c => c.filter((_, i) => i !== idx))
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
        <h1 className="text-base font-semibold text-gray-900">About Page</h1>
      </header>
      <p className="text-xs text-gray-400 p-10">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">About Page</h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          <button onClick={save} disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-sm py-3 border-b-2 transition-colors ${tab === t ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Credentials Tab ── */}
        {tab === 'Credentials' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Each row appears in the credentials sidebar on the About page.</p>
              <button onClick={addCredential} className={btnSecondary}>+ Add Row</button>
            </div>
            <div className="bg-white border border-gray-200 divide-y divide-gray-100">
              {credentials.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <input
                    className={`${inputCls} w-40 shrink-0`}
                    placeholder="Label"
                    value={c.label}
                    onChange={e => setCredentials(arr => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <input
                    className={`${inputCls} flex-1`}
                    placeholder="Value"
                    value={c.value}
                    onChange={e => setCredentials(arr => arr.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                  <button onClick={() => removeCredential(i)}
                    className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors shrink-0">
                    Remove
                  </button>
                </div>
              ))}
              {credentials.length === 0 && <p className="text-xs text-gray-400 p-4">No credentials. Click "+ Add Row" above.</p>}
            </div>
          </div>
        )}

        {/* ── Bio Tab ── */}
        {tab === 'Bio' && (
          <div className="space-y-8">
            <div className="bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-xs text-blue-700">Each new line becomes a separate paragraph on the page. Leave a blank line between paragraphs if you want extra spacing.</p>
            </div>

            <div className="bg-white border border-gray-200 p-6 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Firm Description</h2>
              <p className="text-xs text-gray-400">Shown in the "About the Firm — Kasandy Consulting" section. Each line = one paragraph.</p>
              <textarea
                rows={8}
                className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 font-mono"
                value={firmBio.join('\n')}
                onChange={e => setFirmBio(e.target.value.split('\n'))}
                placeholder={"Line 1 — first paragraph\nLine 2 — second paragraph\n..."} />
            </div>

            <div className="bg-white border border-gray-200 p-6 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Jackee's Biography</h2>
              <p className="text-xs text-gray-400">Shown in the "Meet Jackee Kasandy" section. Each line = one paragraph.</p>
              <textarea
                rows={12}
                className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 font-mono"
                value={jBio.join('\n')}
                onChange={e => setJBio(e.target.value.split('\n'))}
                placeholder={"Line 1 — first paragraph\nLine 2 — second paragraph\n..."} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
