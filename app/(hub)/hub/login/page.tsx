import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Sign in — Kasandy Engine' }

export default function HubLoginPage({
  searchParams,
}: {
  searchParams: { error?: string; reason?: string }
}) {
  const err = searchParams?.error
  const reason = searchParams?.reason

  const headline =
    err === 'not_authorized'
      ? 'That email isn’t authorized for the Engine.'
      : err === 'no_code'
        ? 'That sign-in link arrived without a token. If it was opened by a mail scanner or forwarded, request a new one and paste it into the address bar rather than clicking it.'
        : err === 'auth_failed'
          ? 'That sign-in link expired or was invalid. Please request a new one.'
          : null

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          padding: 32,
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--ox)',
            margin: 0,
          }}
        >
          Kasandy Consulting
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, margin: '6px 0 4px' }}>
          The Engine
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 20px' }}>
          Operator sign-in. A one-time link will be emailed to you.
        </p>
        {headline && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              {headline}
            </p>
            {/* The provider's own words. Two people sign in here, so naming the cause
                leaks nothing — and without it every failure reads identically, which
                is what made this take an evening to work out. */}
            {reason && (
              <p
                style={{
                  color: 'var(--muted)',
                  fontSize: 12,
                  margin: '4px 0 0',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {reason}
              </p>
            )}
          </div>
        )}
        <LoginForm />
      </div>
    </main>
  )
}
