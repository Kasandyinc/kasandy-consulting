'use client'

import { useState, useTransition } from 'react'
import { approveSignOff } from './actions'

export default function SignOffButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  if (!confirming) {
    return (
      <button className="btn ox sm" onClick={() => setConfirming(true)}>
        ⚑ Approve sign-off
      </button>
    )
  }

  return (
    <div>
      <p style={{ marginBottom: 8 }}>
        Approve outreach to <strong>{orgName}</strong>? This is recorded against your name in
        the audit log.
      </p>
      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn ox sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await approveSignOff(orgId)
              if (!res.ok) setError(res.error ?? 'Failed.')
              else setConfirming(false)
            })
          }
        >
          {pending ? 'Approving…' : 'Yes, approve'}
        </button>
        <button className="btn sm" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </button>
      </div>
      {error && <p style={{ color: 'var(--bad)', marginTop: 6 }}>{error}</p>}
    </div>
  )
}
