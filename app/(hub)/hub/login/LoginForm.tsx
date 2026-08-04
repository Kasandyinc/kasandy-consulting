'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Turn Supabase's wording into something worth reading at 7am when you cannot get
 * into your own business. The raw message is still shown underneath — it is the thing
 * to quote if this needs chasing — but the first line should say what to do.
 */
function explain(message: string): string | null {
  const m = message.toLowerCase()
  if (m.includes('rate limit')) {
    return 'Supabase has capped how many sign-in emails it will send this hour. Wait an hour and try once, or raise the limit under Authentication → Rate Limits.'
  }
  if (m.includes('expired')) {
    return 'That link had already expired. Request one and use it straight away.'
  }
  if (m.includes('code challenge') || m.includes('verifier') || m.includes('code_verifier')) {
    return 'That link was opened in a different browser or on a different device from the one that asked for it. Request a new link and open it in this browser.'
  }
  if (m.includes('already') || m.includes('used') || m.includes('invalid')) {
    return 'That link had already been used — often by a mail scanner opening it before you did. Request a new one and paste it into the address bar rather than clicking it.'
  }
  return null
}

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  /**
   * Implicit-flow rescue.
   *
   * When the project is not on PKCE, Supabase returns the session in the URL fragment.
   * A fragment is never sent to the server, so /auth/callback sees no code at all and
   * can only bounce back here — with the fragment still attached, because browsers
   * carry it through a redirect. This is the only place the token is visible, so it is
   * the only place it can be used.
   */
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return
    const params = new URLSearchParams(hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    const hashError = params.get('error_description') ?? params.get('error')

    if (hashError) {
      setState('error')
      setError(decodeURIComponent(hashError.replace(/\+/g, ' ')))
      history.replaceState(null, '', window.location.pathname)
      return
    }
    if (!access_token || !refresh_token) return

    ;(async () => {
      const supabase = createClient()
      const { error: err } = await supabase.auth.setSession({ access_token, refresh_token })
      history.replaceState(null, '', window.location.pathname)
      if (err) {
        setState('error')
        setError(err.message)
        return
      }
      // Middleware decides where this lands: the Engine for an operator, the portal
      // for a client, back here for anyone else.
      window.location.replace('/')
    })()
  }, [])

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
        <div style={{ display: 'grid', gap: 4 }}>
          {explain(error) && (
            <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {explain(error)}
            </p>
          )}
          <p
            style={{
              color: 'var(--muted)',
              fontSize: 12,
              margin: 0,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {error}
          </p>
        </div>
      )}
    </form>
  )
}
