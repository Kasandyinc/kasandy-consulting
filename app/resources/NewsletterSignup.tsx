'use client'

import { useState } from 'react'

export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Submission failed')
      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-white/20 px-6 py-8 text-center">
        <p className="font-display text-2xl font-light text-white mb-2">You're subscribed.</p>
        <p className="font-sans text-xs text-white/60">Look out for the next issue of The Kasandy Brief.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full border border-white/20 bg-transparent px-4 py-3 text-sm font-sans text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors"
        placeholder="your@email.com"
      />
      {status === 'error' && (
        <p className="font-sans text-xs text-kc-red">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-brown w-full justify-center"
      >
        {status === 'loading' ? 'Subscribing...' : 'Subscribe to The Kasandy Brief'}
      </button>
      <p className="font-sans text-[10px] text-white/40">No spam. Unsubscribe any time.</p>
    </form>
  )
}
