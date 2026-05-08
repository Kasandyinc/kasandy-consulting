'use client'

import { useState } from 'react'
import { Download, CheckCircle, ArrowDownToLine } from 'lucide-react'

type Props = {
  id: string          // slug — sent to API for lookup
  title: string
  description: string
  format: string
  category: string
  downloadUrl?: string | null  // pre-resolved URL if file is live; shown immediately after submit
  comingSoon?: boolean
}

export default function LeadMagnetCard({ id, title, description, format, category, downloadUrl, comingSoon }: Props) {
  const [state, setState] = useState<'idle' | 'capturing' | 'submitting' | 'done'>('idle')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(downloadUrl ?? null)

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setState('submitting')
    setError('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resource: id }),  // send slug, not title
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Submission failed')
      if (data.downloadUrl) setResolvedUrl(data.downloadUrl)
      setState('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setState('capturing')
    }
  }

  return (
    <div className="card flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <span className="font-sans text-[10px] tracking-widest uppercase text-kc-brown">{category}</span>
        <div className="flex items-center gap-2">
          <span className="font-sans text-[10px] text-kc-gray-mid">{format}</span>
          {comingSoon && (
            <span className="font-sans text-[9px] tracking-widest uppercase bg-kc-gray-light text-kc-gray-mid px-2 py-0.5">Coming Soon</span>
          )}
        </div>
      </div>
      <h3 className="font-display text-xl font-light leading-snug mb-3">{title}</h3>
      <p className="font-sans text-xs text-kc-gray-mid leading-relaxed mb-6 flex-1">{description}</p>

      {comingSoon ? (
        <div className="border border-dashed border-kc-gray-border px-4 py-3 text-center">
          <p className="font-sans text-xs text-kc-gray-mid">Notify me when available</p>
        </div>
      ) : state === 'idle' ? (
        <button
          onClick={() => setState('capturing')}
          className="btn-outline w-full justify-center"
        >
          <Download size={14} className="mr-2" /> Download Free
        </button>
      ) : state === 'capturing' ? (
        <form onSubmit={handleCapture} className="space-y-3">
          <p className="font-sans text-xs text-kc-gray-mid">Enter your email to receive this guide:</p>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field"
            placeholder="your@email.com"
            autoFocus
          />
          {error && <p className="font-sans text-xs text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-brown flex-1 justify-center text-xs">
              Send Me the Guide
            </button>
            <button type="button" onClick={() => setState('idle')} className="btn-outline px-4 py-3 text-xs">
              Cancel
            </button>
          </div>
        </form>
      ) : state === 'submitting' ? (
        <div className="text-center py-4">
          <p className="font-sans text-xs text-kc-gray-mid">Sending...</p>
        </div>
      ) : (
        // Done state
        <div className="space-y-3">
          {resolvedUrl ? (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-brown w-full justify-center flex items-center gap-2"
            >
              <ArrowDownToLine size={14} />
              Download Now
            </a>
          ) : null}
          <div className="flex items-center gap-3 bg-kc-gray-light px-4 py-3">
            <CheckCircle size={16} className="text-kc-brown shrink-0" />
            <p className="font-sans text-xs text-kc-black">
              {resolvedUrl
                ? `Link also sent to ${email}`
                : `Check your inbox — we've sent the guide to ${email}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
