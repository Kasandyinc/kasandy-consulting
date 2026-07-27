import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Sign in — Kasandy Engine' }

export default function HubLoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const err = searchParams?.error

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
        {err === 'not_authorized' && (
          <p style={{ color: 'var(--bad)', fontSize: 13 }}>
            That email isn’t authorized for the Engine.
          </p>
        )}
        {err === 'auth_failed' && (
          <p style={{ color: 'var(--bad)', fontSize: 13 }}>
            That sign-in link expired or was invalid. Please request a new one.
          </p>
        )}
        <LoginForm />
      </div>
    </main>
  )
}
