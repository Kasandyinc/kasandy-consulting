'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { IntakeQuestion } from '@/lib/engine/delivery'
import { saveIntake } from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

export default function IntakeForm({
  token,
  questions,
  initialAnswers,
}: {
  token: string
  questions: IntakeQuestion[]
  initialAnswers: Record<string, string>
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (key: string, value: string) => setAnswers((a) => ({ ...a, [key]: value }))

  const run = (submit: boolean) =>
    start(async () => {
      const res = await saveIntake({ token, answers, submit })
      setMsg({
        ok: res.ok,
        text: res.ok ? (submit ? 'Sent — thank you.' : 'Saved. You can come back to this link.') : res.error ?? 'Failed.',
      })
      if (res.ok && submit) router.refresh()
    })

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-b">
        {questions.map((q) => (
          <div key={q.key} style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>
              {q.label}
              {q.required && <span style={{ color: 'var(--bad)' }}> *</span>}
            </label>
            {q.help && (
              <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 5 }}>{q.help}</div>
            )}
            {q.type === 'textarea' ? (
              <textarea
                rows={4}
                value={answers[q.key] ?? ''}
                onChange={(e) => set(q.key, e.target.value)}
                style={{ ...field, resize: 'vertical' }}
              />
            ) : q.type === 'select' ? (
              <select value={answers[q.key] ?? ''} onChange={(e) => set(q.key, e.target.value)} style={field}>
                <option value="">Select…</option>
                {(q.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                type={q.type}
                value={answers[q.key] ?? ''}
                onChange={(e) => set(q.key, e.target.value)}
                style={field}
              />
            )}
          </div>
        ))}

        <div className="row" style={{ gap: 9, marginTop: 22 }}>
          <button className="btn ox" disabled={pending} onClick={() => run(true)}>
            {pending ? 'Sending…' : 'Send answers'}
          </button>
          <button className="btn" disabled={pending} onClick={() => run(false)}>
            Save for later
          </button>
        </div>

        {msg && (
          <p style={{ marginTop: 12, color: msg.ok ? 'var(--good)' : 'var(--bad)' }}>{msg.text}</p>
        )}

        <p style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 16 }}>
          Your answers are stored in Canada and used only for this engagement.
        </p>
      </div>
    </div>
  )
}
