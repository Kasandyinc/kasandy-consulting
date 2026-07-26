'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type WorkStat = { value: string; label: string }

type CaseStudy = {
  id: string
  number: string
  label: string
  client: string
  tagline: string
  challenge: string
  approach: string[]
  results: string[]
  published?: boolean
}

type WorkData = {
  stats: WorkStat[]
  partners: string[]
  caseStudies: CaseStudy[]
}

const TABS = ['Stats', 'Partners', 'Case Studies'] as const
type Tab = typeof TABS[number]

const emptyCaseStudy: Omit<CaseStudy, 'id'> = {
  number: '',
  label: '',
  client: '',
  tagline: '',
  challenge: '',
  approach: [],
  results: [],
  published: true,
}

const btnPrimary = 'text-xs bg-gray-900 text-white px-3 py-1.5 hover:bg-gray-700 transition-colors'
const btnSecondary = 'text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors'
const inputCls = 'w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400'

export default function AdminWork() {
  const [tab, setTab] = useState<Tab>('Stats')
  const [data, setData] = useState<WorkData>({ stats: [], partners: [], caseStudies: [] })
  const [loading, setLoading] = useState(true)

  // Stats state
  const [stats, setStats] = useState<WorkStat[]>([])

  // Partners state
  const [partners, setPartners] = useState<string[]>([])
  const [newPartner, setNewPartner] = useState('')

  // Case studies state
  const [caseStudies, setCaseStudies] = useState<CaseStudy[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingCs, setEditingCs] = useState<CaseStudy | null>(null)
  const [showAddCs, setShowAddCs] = useState(false)
  const [newCs, setNewCs] = useState<Omit<CaseStudy, 'id'>>(emptyCaseStudy)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/work')
    const d = await r.json()
    setData(d)
    setStats(d.stats ?? [])
    setPartners(d.partners ?? [])
    setCaseStudies(d.caseStudies ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Stats ──
  async function saveStat(idx: number) {
    const updated = [...stats]
    await fetch('/api/admin/work', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'stats', data: updated }),
    })
    load()
  }

  async function saveAllStats() {
    await fetch('/api/admin/work', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'stats', data: stats }),
    })
    load()
  }

  function addStat() {
    setStats(s => [...s, { value: '', label: '' }])
  }

  function removeStat(idx: number) {
    setStats(s => s.filter((_, i) => i !== idx))
  }

  // ── Partners ──
  async function savePartners(list: string[]) {
    await fetch('/api/admin/work', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'partners', data: list }),
    })
    setPartners(list)
  }

  async function addPartner() {
    if (!newPartner.trim()) return
    const updated = [...partners, newPartner.trim()]
    await savePartners(updated)
    setNewPartner('')
  }

  async function removePartner(idx: number) {
    if (!confirm('Remove this partner?')) return
    await savePartners(partners.filter((_, i) => i !== idx))
  }

  // ── Case Studies ──
  async function saveCaseStudy(cs: CaseStudy) {
    await fetch('/api/admin/work', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'casestudies', data: cs }),
    })
    setEditingCs(null)
    load()
  }

  async function addCaseStudy() {
    await fetch('/api/admin/work', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'casestudies', data: newCs }),
    })
    setShowAddCs(false)
    setNewCs(emptyCaseStudy)
    load()
  }

  async function deleteCaseStudy(id: string) {
    if (!confirm('Delete this case study?')) return
    await fetch('/api/admin/work', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'casestudies', id }),
    })
    load()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
        <h1 className="text-base font-semibold text-gray-900">Work & Case Studies</h1>
      </header>
      <p className="text-xs text-gray-400 p-10">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Work & Case Studies</h1>
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

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* ── Stats Tab ── */}
        {tab === 'Stats' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Edit impact stats shown on the Work page.</p>
              <div className="flex gap-2">
                <button onClick={addStat} className={btnSecondary}>+ Add Stat</button>
                <button onClick={saveAllStats} className={btnPrimary}>Save All Stats</button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 divide-y divide-gray-100">
              {stats.map((s, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <input className="text-sm border border-gray-200 px-3 py-1.5 focus:outline-none focus:border-gray-400 w-32 font-mono"
                    placeholder="Value" value={s.value}
                    onChange={e => setStats(arr => arr.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                  <input className="text-sm border border-gray-200 px-3 py-1.5 focus:outline-none focus:border-gray-400 flex-1"
                    placeholder="Label" value={s.label}
                    onChange={e => setStats(arr => arr.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} />
                  <button onClick={() => saveStat(i)} className={btnSecondary}>Save</button>
                  <button onClick={() => removeStat(i)}
                    className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                    Remove
                  </button>
                </div>
              ))}
              {stats.length === 0 && <p className="text-xs text-gray-400 p-4">No stats yet.</p>}
            </div>
          </div>
        )}

        {/* ── Partners Tab ── */}
        {tab === 'Partners' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <input className="text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 flex-1 max-w-md"
                placeholder="New partner name…" value={newPartner}
                onChange={e => setNewPartner(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPartner() } }} />
              <button onClick={addPartner} className={btnPrimary}>Add Partner</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {partners.map((p, i) => (
                <div key={i} className="flex items-center gap-1 bg-white border border-gray-200 px-3 py-1.5">
                  <span className="text-sm text-gray-700">{p}</span>
                  <button onClick={() => removePartner(i)}
                    className="text-gray-300 hover:text-red-500 ml-2 text-xs leading-none transition-colors">✕</button>
                </div>
              ))}
              {partners.length === 0 && <p className="text-xs text-gray-400">No partners yet.</p>}
            </div>
          </div>
        )}

        {/* ── Case Studies Tab ── */}
        {tab === 'Case Studies' && (
          <div className="space-y-4">
            <div className="flex justify-end mb-2">
              <button onClick={() => { setShowAddCs(true); setEditingCs(null) }} className={btnPrimary}>+ Add Case Study</button>
            </div>

            {/* Add New Form */}
            {showAddCs && (
              <CaseStudyForm
                cs={{ ...newCs, id: '' }}
                onChange={updated => setNewCs({ ...updated })}
                onSave={addCaseStudy}
                onCancel={() => { setShowAddCs(false); setNewCs(emptyCaseStudy) }}
                isNew
              />
            )}

            {/* Existing Case Studies */}
            <div className="space-y-3">
              {caseStudies.map(cs => (
                <div key={cs.id} className="bg-white border border-gray-200">
                  <div className="px-5 py-4 flex items-center gap-4">
                    <span className="font-mono text-xs text-gray-400 w-6">{cs.number}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{cs.label || '(untitled)'}</p>
                      <p className="text-xs text-gray-400">{cs.client}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {cs.published === false && (
                        <span className="text-[10px] text-gray-400 border border-gray-200 px-1.5 py-0.5">Draft</span>
                      )}
                      <button onClick={() => { setEditingCs(cs); setShowAddCs(false) }} className={btnSecondary}>Edit</button>
                      <button onClick={() => deleteCaseStudy(cs.id)}
                        className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                  {editingCs?.id === cs.id && (
                    <div className="border-t border-gray-100 px-5 py-5">
                      <CaseStudyForm
                        cs={editingCs}
                        onChange={updated => setEditingCs(updated)}
                        onSave={() => saveCaseStudy(editingCs)}
                        onCancel={() => setEditingCs(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
              {caseStudies.length === 0 && !showAddCs && (
                <p className="text-xs text-gray-400 bg-white border border-gray-200 p-4">No case studies yet.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function CaseStudyForm({
  cs,
  onChange,
  onSave,
  onCancel,
  isNew,
}: {
  cs: CaseStudy
  onChange: (cs: CaseStudy) => void
  onSave: () => void
  onCancel: () => void
  isNew?: boolean
}) {
  const inputCls = 'w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400'
  const btnPrimary = 'text-xs bg-gray-900 text-white px-3 py-1.5 hover:bg-gray-700 transition-colors'
  const btnSecondary = 'text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 transition-colors'

  return (
    <div className={`space-y-4 ${isNew ? 'bg-white border border-gray-200 p-5' : ''}`}>
      {isNew && <h3 className="text-sm font-semibold text-gray-900">New Case Study</h3>}
      <div className="grid sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Number (e.g. 01)</label>
          <input className={inputCls} value={cs.number}
            onChange={e => onChange({ ...cs, number: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Label / Title *</label>
          <input className={inputCls} value={cs.label}
            onChange={e => onChange({ ...cs, label: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Client *</label>
          <input className={inputCls} value={cs.client}
            onChange={e => onChange({ ...cs, client: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Tagline</label>
        <input className={inputCls} value={cs.tagline}
          onChange={e => onChange({ ...cs, tagline: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Challenge</label>
        <textarea rows={3} className={inputCls} value={cs.challenge}
          onChange={e => onChange({ ...cs, challenge: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Approach (one item per line)</label>
        <textarea rows={5} className={inputCls}
          value={(cs.approach ?? []).join('\n')}
          onChange={e => onChange({ ...cs, approach: e.target.value.split('\n') })} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Results (one item per line)</label>
        <textarea rows={5} className={inputCls}
          value={(cs.results ?? []).join('\n')}
          onChange={e => onChange({ ...cs, results: e.target.value.split('\n') })} />
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={cs.published !== false}
            onChange={e => onChange({ ...cs, published: e.target.checked })} />
          Published (visible on site)
        </label>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onSave} className={btnPrimary}>{isNew ? 'Add Case Study' : 'Save Changes'}</button>
        <button onClick={onCancel} className={btnSecondary}>Cancel</button>
      </div>
    </div>
  )
}
