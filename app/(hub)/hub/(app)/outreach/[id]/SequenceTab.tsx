'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { stageSequence } from './actions'
import { FOUNDER_OUTREACH_V1 } from '@/lib/engine/sequence'

type Step = {
  id: string
  template_id: string | null
  due_on: string | null
  status: string
  send_id: string | null
}
type Sequence = { id: string; status: string; started_on: string | null; sequence_steps: Step[] }

const LABEL = new Map<string, string>(FOUNDER_OUTREACH_V1.map((s) => [s.templateId, s.label]))
const EXTERNAL = new Map<string, boolean>(
  FOUNDER_OUTREACH_V1.map((s) => [s.templateId, s.external]),
)

export default function SequenceTab({
  orgId,
  sequences,
  blockers,
}: {
  orgId: string
  sequences: Sequence[]
  blockers: string[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  if (sequences.length === 0) {
    return (
      <div className="card">
        <div className="card-h"><h3>Sequence</h3></div>
        <div className="card-b">
          <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
            No sequence staged. Staging creates the Founder Outreach v1 ladder — seven
            steps over fourteen days. Nothing sends on its own: the daily job only moves a
            due step to READY, and every send waits for your click.
          </p>
          <button
            className="btn ox"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await stageSequence(orgId)
                if (!res.ok) setError(res.error ?? 'Could not stage.')
                else { setError(''); router.refresh() }
              })
            }
          >
            {pending ? 'Staging…' : 'Stage Founder Outreach v1'}
          </button>
          {error && (
            <div className="err" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {sequences.map((seq) => (
        <div className="card" key={seq.id} style={{ marginBottom: 16 }}>
          <div className="card-h between">
            <h3>Founder Outreach v1</h3>
            <span className={`tag ${seq.status === 'halted' ? 'bad' : 'good'}`}>{seq.status}</span>
          </div>
          <table>
            <thead>
              <tr><th>Step</th><th>Due</th><th>State</th><th>Why</th></tr>
            </thead>
            <tbody>
              {[...seq.sequence_steps]
                .sort((a, b) => (a.due_on ?? '').localeCompare(b.due_on ?? ''))
                .map((step) => {
                  const isExternal = EXTERNAL.get(step.template_id ?? '') ?? true
                  const blocked = isExternal && blockers.length > 0
                  return (
                    <tr key={step.id}>
                      <td style={{ fontWeight: 600 }}>
                        {LABEL.get(step.template_id ?? '') ?? step.template_id}
                        <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                          {step.template_id}
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 11.5 }}>{step.due_on ?? '—'}</td>
                      <td>
                        {step.status === 'sent' ? (
                          <span className="tag good">SENT</span>
                        ) : blocked ? (
                          <span className="tag bad">BLOCKED</span>
                        ) : step.status === 'ready' ? (
                          <span className="tag good">READY</span>
                        ) : !isExternal ? (
                          <span className="tag info">TASK</span>
                        ) : (
                          <span className="tag">{step.status.toUpperCase()}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {blocked
                          ? blockers.join('; ')
                          : !isExternal
                            ? 'In-app call task — never sent'
                            : step.status === 'ready'
                              ? 'Waiting for your click'
                              : 'Advances on its due date'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
          <div className="card-b" style={{ borderTop: '1px solid var(--line)' }}>
            <Link href={`/outreach/${orgId}/compose`} className="btn sm ox">
              ✉ Open composer
            </Link>
          </div>
        </div>
      ))}
    </>
  )
}
