'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signProposal } from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

export default function SignPanel({
  token,
  total,
  deposit,
}: {
  token: string
  total: string
  deposit: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')

  return (
    <div className="card" style={{ marginTop: 16, borderLeft: '3px solid var(--ox)' }}>
      <div className="card-h"><h3>Accept this proposal</h3></div>
      <div className="card-b">
        <p style={{ color: 'var(--muted)', marginBottom: 16 }}>
          Signing accepts the scope and terms above for <strong>{total}</strong>, with{' '}
          <strong>{deposit}</strong> due on signature. We will send the deposit invoice
          straight after.
        </p>

        <div className="row wrap" style={{ gap: 12 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label className="eyebrow" style={{ display: 'block' }}>Your full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={field} />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label className="eyebrow" style={{ display: 'block' }}>Your email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={field}
            />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="eyebrow" style={{ display: 'block' }}>Your title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={field} />
        </div>

        <label
          className="row"
          style={{ gap: 9, marginTop: 18, alignItems: 'flex-start', cursor: 'pointer' }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 13 }}>
            I have read the scope and terms above, and I have authority to accept them on
            behalf of my organisation.
          </span>
        </label>

        <button
          className="btn ox"
          style={{ marginTop: 18, width: '100%', justifyContent: 'center', padding: '11px' }}
          disabled={pending || !agreed || !name.trim() || !email.trim()}
          onClick={() =>
            start(async () => {
              const res = await signProposal({ token, name, email, title, agreed })
              if (res.ok) {
                router.refresh()
              } else {
                setError(res.error ?? 'Something went wrong.')
              }
            })
          }
        >
          {pending ? 'Signing…' : 'Sign and accept'}
        </button>

        {error && <p style={{ marginTop: 12, color: 'var(--bad)' }}>{error}</p>}

        <p style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 16, lineHeight: 1.6 }}>
          Typing your name here records your acceptance along with the date, your address,
          and a fingerprint of this exact document. Keep this link as your copy. If you
          would rather sign a countersigned PDF instead, reply to the email and we will
          arrange it.
        </p>
      </div>
    </div>
  )
}
