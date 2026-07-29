'use client'

import { useState } from 'react'
import Turnstile from '@/components/Turnstile'
import { FORM_DEFAULTS, type FormConfig } from '@/lib/forms/config'

/** Wording comes from the hub CMS; layout and spam controls stay here. */
export default function NewsletterSignup({
  config = FORM_DEFAULTS.newsletter,
}: { config?: FormConfig }) {
  const [email, setEmail] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [formLoadedAt] = useState(() => Date.now())
  const [turnstileToken, setTurnstileToken] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, website, formLoadedAt, turnstileToken }),
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
        <p className="font-sans text-xs text-white/60">{config.successMessage}</p>
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
        placeholder={config.fields.find(f => f.key === 'email')?.placeholder ?? 'your@email.com'}
      />
      {/* Honeypot — hidden from real users */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-5000px' }}>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
      </div>
      <Turnstile onVerify={setTurnstileToken} />
      {status === 'error' && (
        <p className="font-sans text-xs text-kc-red">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'loading'}
        className="btn-brown w-full justify-center"
      >
        {status === 'loading' ? 'Subscribing...' : config.submitLabel}
      </button>
      <p className="font-sans text-[10px] text-white/40">No spam. Unsubscribe any time.</p>
    </form>
  )
}
