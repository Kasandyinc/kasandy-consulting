'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (err) {
      setState('error')
      setError(err.message)
    } else {
      setState('sent')
    }
  }

  if (state === 'sent') {
    return (
      <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)' }}>
        Check your inbox — a one-time sign-in link is on its way to <strong>{email}</strong>.
        You can close this tab; the link opens the Engine.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <input
        type="email"
        required
        autoComplete="email"
        placeholder="you@kasandyconsulting.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          padding: '11px 12px',
          border: '1px solid var(--line)',
          background: 'var(--paper)',
          color: 'var(--ink)',
          fontSize: 14,
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        style={{
          padding: '11px 12px',
          background: 'var(--ox)',
          color: '#fff',
          border: 'none',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: state === 'sending' ? 'default' : 'pointer',
          opacity: state === 'sending' ? 0.6 : 1,
        }}
      >
        {state === 'sending' ? 'Sending…' : 'Send sign-in link'}
      </button>
      {state === 'error' && (
        <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0 }}>{error}</p>
      )}
    </form>
  )
}
