'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'

type SiteSettings = {
  heroTagline: string
  heroSubtext: string
  ctaLabel: string
  ctaHref: string
  announcementBar: string
  announcementBarEnabled: boolean
  bookingUrl: string
  instagramUrl: string
  linkedinUrl: string
  whatsappNumber: string
}

const FIELD_META: { key: keyof SiteSettings; label: string; type: 'text' | 'toggle'; placeholder?: string }[] = [
  { key: 'heroTagline',           label: 'Homepage hero tagline',        type: 'text',   placeholder: 'Where Ambition Meets Access.' },
  { key: 'heroSubtext',           label: 'Homepage hero subtext',        type: 'text',   placeholder: 'Strategy, systems, and support…' },
  { key: 'ctaLabel',              label: 'Primary CTA button label',     type: 'text',   placeholder: 'Work With Us' },
  { key: 'ctaHref',               label: 'Primary CTA button link',      type: 'text',   placeholder: '/contact' },
  { key: 'bookingUrl',            label: 'Booking / Calendly URL',       type: 'text',   placeholder: 'https://calendly.com/…' },
  { key: 'announcementBar',       label: 'Announcement bar text',        type: 'text',   placeholder: 'Now accepting clients for Q3…' },
  { key: 'announcementBarEnabled',label: 'Show announcement bar',        type: 'toggle' },
  { key: 'linkedinUrl',           label: 'LinkedIn URL',                 type: 'text',   placeholder: 'https://www.linkedin.com/in/…' },
  { key: 'instagramUrl',          label: 'Instagram URL',                type: 'text',   placeholder: 'https://instagram.com/…' },
  { key: 'whatsappNumber',        label: 'WhatsApp number (digits only)',type: 'text',   placeholder: '17783854480' },
]

export default function AdminSettings() {
  const router = useRouter()
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function load() {
    const data = await fetch('/api/admin/settings').then(r => r.json())
    setSettings(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function update<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }

  async function save() {
    if (!settings) return
    setSaving(true)
    await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
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
          <h1 className="text-base font-semibold text-gray-900">Site Settings</h1>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-900">Sign Out</button>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-gray-500 mb-8">
          Global settings for the website. Save all changes at the bottom.
        </p>

        {loading && <p className="text-sm text-gray-400">Loading…</p>}

        {settings && (
          <div className="bg-white border border-gray-200 p-6 space-y-6">
            {FIELD_META.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                {type === 'toggle' ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={settings[key] as boolean}
                        onChange={e => update(key, e.target.checked as SiteSettings[typeof key])}
                        className="sr-only"
                      />
                      <div className={`w-10 h-6 rounded-full transition-colors ${settings[key] ? 'bg-gray-900' : 'bg-gray-300'}`} />
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${settings[key] ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-xs text-gray-500">{settings[key] ? 'Visible' : 'Hidden'}</span>
                  </label>
                ) : (
                  <input
                    type="text"
                    value={settings[key] as string}
                    onChange={e => update(key, e.target.value as SiteSettings[typeof key])}
                    placeholder={placeholder}
                    className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400"
                  />
                )}
              </div>
            ))}

            <div className="pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 text-xs bg-gray-900 text-white px-5 py-2.5 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Save size={13} />
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save All Settings'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
