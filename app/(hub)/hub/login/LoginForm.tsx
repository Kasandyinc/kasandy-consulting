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
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

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

  /**
   * Sign in with the six-digit code instead of the link.
   *
   * The link is fragile in a way that has nothing to do with this application. It is
   * a URL that works once, sent into a mailbox whose provider opens URLs to check
   * them — Microsoft Defender's Safe Links does exactly this — so the token can be
   * spent by a scanner seconds after delivery and before anyone has clicked. From the
   * person's side it looks like a link that expires the instant it arrives, which is
   * precisely what happened here, and it happens whether the link is clicked or
   * pasted, because the damage was done at delivery.
   *
   * A typed code cannot be spent by anything that merely reads the email. It also
   * needs no PKCE verifier, so it works from a phone when the link was requested on a
   * laptop — the other way this fails.
   */
  async function onVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifying(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })
    setVerifying(false)
    if (err) {
      setState('error')
      setError(err.message)
      return
    }
    window.location.replace('/')
  }

  if (state === 'sent') {
    return (
      <div style={{ display: 'grid', gap: 16 }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--ink)', margin: 0 }}>
          Sent to <strong>{email}</strong>. Use either the link or the six-digit code in
          that email.
        </p>

        <form onSubmit={onVerify} style={{ display: 'grid', gap: 10 }}>
          <label style={{ fontSize: 13, color: 'var(--muted)' }}>
            Six-digit code
          </label>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={8}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={{
              padding: '11px 12px',
              border: '1px solid var(--line)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontSize: 18,
              letterSpacing: '0.3em',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={verifying || code.length < 6}
            style={{
              padding: '11px 12px',
              background: 'var(--ox)',
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.04em',
              cursor: verifying || code.length < 6 ? 'default' : 'pointer',
              opacity: verifying || code.length < 6 ? 0.5 : 1,
            }}
          >
            {verifying ? 'Checking…' : 'Sign in with code'}
          </button>
          {error && (
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

        <button
          type="button"
          onClick={() => {
            setState('idle')
            setCode('')
            setError('')
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--muted)',
            fontSize: 12,
            textDecoration: 'underline',
            cursor: 'pointer',
            justifySelf: 'start',
          }}
        >
          Use a different address
        </button>
      </div>
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
