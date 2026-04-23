'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

type Photo = { id: string; src: string; alt: string; caption?: string; event?: string }
type Video = { id: string; embedUrl: string; title: string; event?: string }
type Quote = { id: string; quote: string; name: string; title: string; organisation: string }

export default function AdminSpeaking() {
  const router = useRouter()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])

  const [photoForm, setPhotoForm] = useState({ src: '', alt: '', caption: '', event: '' })
  const [videoForm, setVideoForm] = useState({ embedUrl: '', title: '', event: '' })
  const [quoteForm, setQuoteForm] = useState({ quote: '', name: '', title: '', organisation: '' })

  const [photoStatus, setPhotoStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [videoStatus, setVideoStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [quoteStatus, setQuoteStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  async function loadAll() {
    const [p, v, q] = await Promise.all([
      fetch('/api/admin/speaking/photos').then(r => r.json()),
      fetch('/api/admin/speaking/videos').then(r => r.json()),
      fetch('/api/admin/speaking/quotes').then(r => r.json()),
    ])
    setPhotos(p)
    setVideos(v)
    setQuotes(q)
  }

  useEffect(() => { loadAll() }, [])

  async function addPhoto(e: React.FormEvent) {
    e.preventDefault()
    setPhotoStatus('loading')
    const res = await fetch('/api/admin/speaking/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photoForm),
    })
    if (res.ok) {
      setPhotoForm({ src: '', alt: '', caption: '', event: '' })
      setPhotoStatus('idle')
      loadAll()
    } else {
      setPhotoStatus('error')
    }
  }

  async function deletePhoto(id: string) {
    await fetch('/api/admin/speaking/photos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadAll()
  }

  async function addVideo(e: React.FormEvent) {
    e.preventDefault()
    setVideoStatus('loading')
    const res = await fetch('/api/admin/speaking/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(videoForm),
    })
    if (res.ok) {
      setVideoForm({ embedUrl: '', title: '', event: '' })
      setVideoStatus('idle')
      loadAll()
    } else {
      setVideoStatus('error')
    }
  }

  async function deleteVideo(id: string) {
    await fetch('/api/admin/speaking/videos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadAll()
  }

  async function addQuote(e: React.FormEvent) {
    e.preventDefault()
    setQuoteStatus('loading')
    const res = await fetch('/api/admin/speaking/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quoteForm),
    })
    if (res.ok) {
      setQuoteForm({ quote: '', name: '', title: '', organisation: '' })
      setQuoteStatus('idle')
      loadAll()
    } else {
      setQuoteStatus('error')
    }
  }

  async function deleteQuote(id: string) {
    await fetch('/api/admin/speaking/quotes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadAll()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Speaking Media</h1>
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-900">Sign Out</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-12">

        {/* Photos */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Photos ({photos.length})</h2>
          {photos.length > 0 && (
            <div className="space-y-2 mb-6">
              {photos.map(p => (
                <div key={p.id} className="flex items-center gap-4 bg-white border border-gray-200 px-4 py-3">
                  <img src={p.src} alt={p.alt} className="w-16 h-12 object-cover bg-gray-100 shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.alt}</p>
                    {p.event && <p className="text-xs text-gray-500">{p.event}</p>}
                    {p.caption && <p className="text-xs text-gray-400 truncate">{p.caption}</p>}
                  </div>
                  <button onClick={() => deletePhoto(p.id)} className="text-gray-400 hover:text-red-600 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addPhoto} className="bg-white border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-700 mb-3">Add Photo</p>
            <input required placeholder="Image URL (src) *" value={photoForm.src} onChange={e => setPhotoForm(p => ({ ...p, src: e.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <input required placeholder="Alt text *" value={photoForm.alt} onChange={e => setPhotoForm(p => ({ ...p, alt: e.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Caption (optional)" value={photoForm.caption} onChange={e => setPhotoForm(p => ({ ...p, caption: e.target.value }))} className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              <input placeholder="Event (optional)" value={photoForm.event} onChange={e => setPhotoForm(p => ({ ...p, event: e.target.value }))} className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            </div>
            {photoStatus === 'error' && <p className="text-xs text-red-600">Failed to add photo.</p>}
            <button type="submit" disabled={photoStatus === 'loading'} className="bg-gray-900 text-white text-xs px-4 py-2 hover:bg-gray-700 disabled:opacity-50">
              {photoStatus === 'loading' ? 'Adding...' : 'Add Photo'}
            </button>
          </form>
        </section>

        {/* Videos */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Videos ({videos.length})</h2>
          {videos.length > 0 && (
            <div className="space-y-2 mb-6">
              {videos.map(v => (
                <div key={v.id} className="flex items-center gap-4 bg-white border border-gray-200 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{v.title}</p>
                    <p className="text-xs text-gray-400 truncate">{v.embedUrl}</p>
                    {v.event && <p className="text-xs text-gray-500">{v.event}</p>}
                  </div>
                  <button onClick={() => deleteVideo(v.id)} className="text-gray-400 hover:text-red-600 transition-colors shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addVideo} className="bg-white border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-700 mb-3">Add Video</p>
            <input required placeholder="Embed URL (YouTube/Vimeo) *" value={videoForm.embedUrl} onChange={e => setVideoForm(p => ({ ...p, embedUrl: e.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <input required placeholder="Video title *" value={videoForm.title} onChange={e => setVideoForm(p => ({ ...p, title: e.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <input placeholder="Event (optional)" value={videoForm.event} onChange={e => setVideoForm(p => ({ ...p, event: e.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            {videoStatus === 'error' && <p className="text-xs text-red-600">Failed to add video.</p>}
            <button type="submit" disabled={videoStatus === 'loading'} className="bg-gray-900 text-white text-xs px-4 py-2 hover:bg-gray-700 disabled:opacity-50">
              {videoStatus === 'loading' ? 'Adding...' : 'Add Video'}
            </button>
          </form>
        </section>

        {/* Speaking Quotes */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">Speaking Quotes ({quotes.length})</h2>
          {quotes.length > 0 && (
            <div className="space-y-2 mb-6">
              {quotes.map(q => (
                <div key={q.id} className="flex items-start gap-4 bg-white border border-gray-200 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 italic mb-1">"{q.quote}"</p>
                    <p className="text-xs font-medium text-gray-900">{q.name}</p>
                    {(q.title || q.organisation) && (
                      <p className="text-xs text-gray-500">{[q.title, q.organisation].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                  <button onClick={() => deleteQuote(q.id)} className="text-gray-400 hover:text-red-600 transition-colors shrink-0 mt-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={addQuote} className="bg-white border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-medium text-gray-700 mb-3">Add Speaking Quote</p>
            <textarea required placeholder="Quote *" value={quoteForm.quote} onChange={e => setQuoteForm(p => ({ ...p, quote: e.target.value }))} rows={3} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
            <input required placeholder="Name *" value={quoteForm.name} onChange={e => setQuoteForm(p => ({ ...p, name: e.target.value }))} className="w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Title" value={quoteForm.title} onChange={e => setQuoteForm(p => ({ ...p, title: e.target.value }))} className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              <input placeholder="Organisation" value={quoteForm.organisation} onChange={e => setQuoteForm(p => ({ ...p, organisation: e.target.value }))} className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            </div>
            {quoteStatus === 'error' && <p className="text-xs text-red-600">Failed to add quote.</p>}
            <button type="submit" disabled={quoteStatus === 'loading'} className="bg-gray-900 text-white text-xs px-4 py-2 hover:bg-gray-700 disabled:opacity-50">
              {quoteStatus === 'loading' ? 'Adding...' : 'Add Quote'}
            </button>
          </form>
        </section>

      </main>
    </div>
  )
}
