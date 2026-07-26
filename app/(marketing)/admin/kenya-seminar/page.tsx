'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type SeminarData = {
  nextDates: string
  location: string
  sessionTime: string
  earlyBirdPrice: string
  standardPrice: string
  registrationOpen: boolean
  registrationNote: string
}

const EMPTY: SeminarData = {
  nextDates: '',
  location: '',
  sessionTime: '',
  earlyBirdPrice: '',
  standardPrice: '',
  registrationOpen: false,
  registrationNote: '',
}

const inputCls = 'w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400'
const btnPrimary = 'text-xs bg-gray-900 text-white px-3 py-1.5 hover:bg-gray-700 transition-colors'

export default function AdminKenyaSeminar() {
  const [form, setForm] = useState<SeminarData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/kenya-seminar')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object') setForm({ ...EMPTY, ...d })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/admin/kenya-seminar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Kenya Seminar</h1>
        </div>
        {saved && <span className="text-xs text-green-600">Saved!</span>}
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <div className="bg-blue-50 border border-blue-200 px-4 py-3 mb-6">
          <p className="text-xs text-blue-700">These dates will be shown on the Kenya seminar page and registration section.</p>
        </div>

        {loading ? (
          <p className="text-xs text-gray-400">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="bg-white border border-gray-200 p-6 space-y-5">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Next Seminar Dates (e.g. "October 1–2, 2025")</label>
              <input className={inputCls} value={form.nextDates}
                placeholder="October 1–2, 2025"
                onChange={e => setForm(f => ({ ...f, nextDates: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Location (e.g. "Nairobi, Kenya (venue TBC) + Virtual option")</label>
              <input className={inputCls} value={form.location}
                placeholder="Nairobi, Kenya (venue TBC) + Virtual option"
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Session Hours (e.g. "8:30AM – 4:30PM")</label>
              <input className={inputCls} value={form.sessionTime}
                placeholder="8:30AM – 4:30PM"
                onChange={e => setForm(f => ({ ...f, sessionTime: e.target.value }))} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Early Bird Price (e.g. "KSH 10,000")</label>
                <input className={inputCls} value={form.earlyBirdPrice}
                  placeholder="KSH 10,000"
                  onChange={e => setForm(f => ({ ...f, earlyBirdPrice: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Standard Price at door (e.g. "KSH 12,000")</label>
                <input className={inputCls} value={form.standardPrice}
                  placeholder="KSH 12,000"
                  onChange={e => setForm(f => ({ ...f, standardPrice: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Registration Note (short text near CTA, e.g. "Seats are filling fast")</label>
              <input className={inputCls} value={form.registrationNote}
                placeholder="Seats are filling fast"
                onChange={e => setForm(f => ({ ...f, registrationNote: e.target.value }))} />
            </div>

            <div className="flex items-center gap-3 py-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.registrationOpen}
                  onChange={e => setForm(f => ({ ...f, registrationOpen: e.target.checked }))} />
                Registration Open
              </label>
              <span className={`text-xs px-2 py-0.5 border ${form.registrationOpen ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {form.registrationOpen ? 'Open' : 'Closed'}
              </span>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={saving} className={btnPrimary}>
                {saving ? 'Saving…' : 'Save Seminar Details'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
