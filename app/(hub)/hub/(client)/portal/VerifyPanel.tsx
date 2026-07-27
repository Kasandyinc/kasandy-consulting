'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verifyPhase } from './actions'

export default function VerifyPanel({ phaseId, phaseName }: { phaseId: string; phaseName: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  if (!open) {
    return (
      <div className="row between center wrap" style={{ gap: 10 }}>
        <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          Ready for you to check. Take your time — nothing is billed for this phase until
          you confirm it works.
        </span>
        <button className="btn ox" onClick={() => setOpen(true)}>
          Mark verified live
        </button>
      </div>
    )
  }

  return (
    <div
      style={{
        border: '1px solid var(--oxline)',
        background: 'var(--oxwash)',
        borderRadius: 8,
        padding: 14,
      }}
    >
      <strong>Confirm “{phaseName}” is working</strong>
      <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: '6px 0 12px' }}>
        This closes the phase and releases its invoice. It cannot be undone from here —
        if something turns out to be wrong afterwards, tell us and we will fix it.
      </p>

      <textarea
        rows={2}
        value={note}
        placeholder="Anything you want on the record (optional)"
        onChange={(e) => setNote(e.target.value)}
        style={{
          width: '100%',
          border: '1px solid var(--line)',
          borderRadius: 8,
          padding: '9px 11px',
          fontSize: 13,
          fontFamily: 'var(--sans)',
          background: '#fff',
          resize: 'vertical',
        }}
      />

      <div className="row" style={{ gap: 8, marginTop: 11 }}>
        <button
          className="btn ox"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await verifyPhase({ phaseId, note })
              if (res.ok) {
                router.refresh()
              } else {
                setError(res.error ?? 'Something went wrong.')
              }
            })
          }
        >
          {pending ? 'Confirming…' : 'Yes — verified live'}
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          Not yet
        </button>
      </div>

      {error && <p style={{ marginTop: 10, color: 'var(--bad)' }}>{error}</p>}
    </div>
  )
}
