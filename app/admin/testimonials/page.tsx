'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Star, Check } from 'lucide-react'

type Review = {
  id: string
  name: string
  title: string
  organisation: string
  quote: string
  audience: string
  featured: boolean
  approved: boolean
  date: string
}

export default function AdminTestimonials() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function load() {
    const data = await fetch('/api/admin/testimonials').then(r => r.json())
    setReviews(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggle(id: string, field: 'approved' | 'featured', current: boolean) {
    await fetch('/api/admin/testimonials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [field]: !current }),
    })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this review? This cannot be undone.')) return
    await fetch('/api/admin/testimonials', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  const audienceLabel: Record<string, string> = {
    entrepreneur: 'Entrepreneur',
    government: 'Government',
    nonprofit: 'Non-Profit',
    international: 'International',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Testimonials</h1>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-900">Sign Out</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        <div className="mb-6 flex items-center gap-6 text-xs text-gray-500">
          <span>{reviews.filter(r => r.approved).length} approved</span>
          <span>{reviews.filter(r => !r.approved).length} pending</span>
          <span>{reviews.filter(r => r.featured).length} featured</span>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading...</p>}

        {!loading && reviews.length === 0 && (
          <div className="bg-white border border-gray-200 px-6 py-12 text-center">
            <p className="text-sm text-gray-500">No reviews yet. Submissions will appear here for approval.</p>
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r.id} className={`bg-white border px-5 py-4 ${r.approved ? 'border-gray-200' : 'border-amber-200 bg-amber-50/20'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {!r.approved && (
                        <span className="text-[10px] tracking-wide uppercase bg-amber-100 text-amber-700 px-2 py-0.5">Pending</span>
                      )}
                      {r.approved && (
                        <span className="text-[10px] tracking-wide uppercase bg-green-100 text-green-700 px-2 py-0.5">Approved</span>
                      )}
                      {r.featured && (
                        <span className="text-[10px] tracking-wide uppercase bg-gray-100 text-gray-600 px-2 py-0.5">Featured</span>
                      )}
                      {r.audience && (
                        <span className="text-[10px] tracking-wide uppercase text-gray-400">{audienceLabel[r.audience] || r.audience}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 italic mb-2">"{r.quote}"</p>
                    <p className="text-xs font-medium text-gray-900">{r.name}</p>
                    {(r.title || r.organisation) && (
                      <p className="text-xs text-gray-500">{[r.title, r.organisation].filter(Boolean).join(', ')}</p>
                    )}
                    {r.date && <p className="text-xs text-gray-400 mt-1">{r.date}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggle(r.id, 'approved', r.approved)}
                      title={r.approved ? 'Remove approval' : 'Approve'}
                      className={`p-1.5 rounded transition-colors ${r.approved ? 'text-green-600 hover:text-gray-400' : 'text-gray-300 hover:text-green-600'}`}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      onClick={() => toggle(r.id, 'featured', r.featured)}
                      title={r.featured ? 'Unfeature' : 'Feature'}
                      className={`p-1.5 rounded transition-colors ${r.featured ? 'text-yellow-500 hover:text-gray-400' : 'text-gray-300 hover:text-yellow-500'}`}
                    >
                      <Star size={15} />
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="p-1.5 text-gray-300 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
