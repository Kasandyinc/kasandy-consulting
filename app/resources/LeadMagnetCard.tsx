'use client'

import { useState } from 'react'
import { Download, CheckCircle } from 'lucide-react'

type Props = {
  id: string
  title: string
  description: string
  format: string
  category: string
}

export default function LeadMagnetCard({ id, title, description, format, category }: Props) {
  const [state, setState] = useState<'idle' | 'capturing' | 'submitting' | 'done'>('idle')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setState('submitting')
    setError('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resource: title }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Submission failed')
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
        <span className="font-sans text-[10px] text-kc-gray-mid">{format}</span>
      </div>
      <h3 className="font-display text-xl font-light leading-snug mb-3">{title}</h3>
      <p className="font-sans text-xs text-kc-gray-mid leading-relaxed mb-6 flex-1">{description}</p>

      {state === 'idle' && (
        <button
          onClick={() => setState('capturing')}
          className="btn-outline w-full justify-center"
        >
          <Download size={14} className="mr-2" /> Download Free Guide
        </button>
      )}

      {state === 'capturing' && (
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
          {error && <p className="font-sans text-xs text-kc-red">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-brown flex-1 justify-center text-xs">
              Send Me the Guide
            </button>
            <button type="button" onClick={() => setState('idle')} className="btn-outline px-4 py-3 text-xs">
              Cancel
            </button>
          </div>
        </form>
      )}

      {state === 'submitting' && (
        <div className="text-center py-4">
          <p className="font-sans text-xs text-kc-gray-mid">Sending...</p>
        </div>
      )}

      {state === 'done' && (
        <div className="flex items-center gap-3 bg-kc-gray-light px-4 py-3">
          <CheckCircle size={16} className="text-kc-brown shrink-0" />
          <p className="font-sans text-xs text-kc-black">Check your inbox! The guide is on its way.</p>
        </div>
      )}
    </div>
  )
}
