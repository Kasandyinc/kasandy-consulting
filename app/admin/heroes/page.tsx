'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Save, ImageOff } from 'lucide-react'

type PageHeroConfig = {
  page: string
  image: string
  label: string
  title: string
  subtitle: string
  position: string
}

const PAGE_LABELS: Record<string, string> = {
  about: 'About',
  entrepreneurs: 'Entrepreneurs & Founders',
  government: 'Government & Public Sector',
  nonprofits: 'Non-Profit Organizations',
  kenya: 'Kenya & International',
  speaking: 'Speaking',
  work: 'Work & Results',
  contact: 'Contact',
  services: 'Services',
  press: 'Press & Media',
  resources: 'Resources',
}

const POSITIONS = ['object-center', 'object-top', 'object-bottom', 'object-left', 'object-right']

export default function AdminHeroes() {
  const router = useRouter()
  const [heroes, setHeroes] = useState<PageHeroConfig[]>([])
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function load() {
    const data = await fetch('/api/admin/heroes').then(r => r.json())
    setHeroes(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function update(page: string, field: keyof PageHeroConfig, value: string) {
    setHeroes(prev => prev.map(h => h.page === page ? { ...h, [field]: value } : h))
  }

  async function save(hero: PageHeroConfig) {
    setSaving(hero.page)
    await fetch('/api/admin/heroes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hero),
    })
    setSaving(null)
    setSaved(hero.page)
    setTimeout(() => setSaved(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Page Heroes</h1>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-900">Sign Out</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-sm text-gray-500 mb-8">
          Edit the hero section (image, title, subtitle) for each page. Changes are saved individually.
        </p>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        <div className="space-y-6">
          {heroes.map(hero => (
            <div key={hero.page} className="bg-white border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  {PAGE_LABELS[hero.page] || hero.page}
                  <span className="ml-2 text-xs font-normal text-gray-400">/{hero.page}</span>
                </h2>
                {hero.image ? (
                  <div className="w-16 h-10 overflow-hidden bg-gray-100 rounded">
                    <img src={hero.image} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-10 flex items-center justify-center bg-gray-100 rounded">
                    <ImageOff size={14} className="text-gray-400" />
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Image path</label>
                  <input
                    type="text"
                    value={hero.image}
                    onChange={e => update(hero.page, 'image', e.target.value)}
                    placeholder="/images/hero-about.jpg"
                    className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Image position</label>
                  <select
                    value={hero.position}
                    onChange={e => update(hero.page, 'position', e.target.value)}
                    className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 bg-white"
                  >
                    {POSITIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Label (eyebrow text)</label>
                <input
                  type="text"
                  value={hero.label}
                  onChange={e => update(hero.page, 'label', e.target.value)}
                  className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs text-gray-500 mb-1">Title (H1)</label>
                <input
                  type="text"
                  value={hero.title}
                  onChange={e => update(hero.page, 'title', e.target.value)}
                  className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400"
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs text-gray-500 mb-1">Subtitle</label>
                <textarea
                  value={hero.subtitle}
                  onChange={e => update(hero.page, 'subtitle', e.target.value)}
                  rows={2}
                  className="w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400 resize-none"
                />
              </div>

              <button
                onClick={() => save(hero)}
                disabled={saving === hero.page}
                className="flex items-center gap-2 text-xs bg-gray-900 text-white px-4 py-2 hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Save size={13} />
                {saving === hero.page ? 'Saving…' : saved === hero.page ? '✓ Saved' : 'Save'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
