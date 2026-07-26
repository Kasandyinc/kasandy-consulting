import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import SignOutButton from './SignOutButton'

export const dynamic = 'force-dynamic'

export default async function HubHome() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Defense-in-depth: middleware also gates, but never render the Engine to a
  // non-operator.
  if (!isOperator(user?.email)) redirect('/login')

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--card)',
        }}
      >
        <div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ox)',
            }}
          >
            Kasandy Consulting
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginLeft: 10 }}>
            The Engine
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            {user?.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main style={{ padding: '40px 24px', maxWidth: 920, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, margin: '0 0 8px' }}>
          Welcome in.
        </h1>
        <p style={{ color: 'var(--muted)', maxWidth: 560, lineHeight: 1.6 }}>
          The operator app scaffold is live and isolated on <code>hub.kasandyconsulting.com</code>.
          Outreach — the 29-prospect pipeline, records with provenance, the send-gate and
          composer — arrives across the next PRs, wired to live Supabase data.
        </p>
        <div
          style={{
            marginTop: 28,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            padding: '16px 18px',
            fontSize: 12.5,
            color: 'var(--muted)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.6,
          }}
        >
          SYSTEM · authenticated via Supabase Auth (ca-central-1) · operator allow-list enforced ·
          no trackers, no external fonts on this surface.
        </div>
      </main>
    </div>
  )
}
