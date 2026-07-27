'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatMoney } from '@/lib/engine/money'
import {
  createEngagement,
  savePhase,
  saveDeliverable,
  deleteDeliverable,
  requestVerification,
  inviteClientUser,
  setClientUserActive,
} from './actions'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

const PHASE_TAG: Record<string, string> = {
  planned: 'hold',
  active: 'info',
  in_review: 'warn',
  verified: 'good',
  blocked: 'bad',
}

const PHASE_STATUSES = ['planned', 'active', 'in_review', 'verified', 'blocked']
const DELIVERABLE_STATUSES = ['todo', 'doing', 'done', 'accepted']

type Engagement = { id: string; name: string; verified_at: string | null }
type Phase = {
  id: string
  engagement_id: string
  position: number
  name: string
  brief_md: string
  status: string
  target_on: string | null
  verified_at: string | null
  verified_by: string | null
  verify_note: string | null
  amount_cents: number
}
type Deliverable = { id: string; phase_id: string; name: string; detail: string | null; status: string }
type ClientUser = { id: string; email: string; name: string | null; title: string | null; active: boolean }
type InvoiceLite = { phase_id: string | null; number: string; status: string; amount: string }

export default function DeliveryWorkspace({
  clientId,
  engagements,
  phases,
  deliverables,
  users,
  invoices,
}: {
  clientId: string
  engagements: Engagement[]
  phases: Phase[]
  deliverables: Deliverable[]
  users: ClientUser[]
  invoices: InvoiceLite[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string; warning?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, text: res.ok ? res.warning ?? okText : res.error ?? 'Failed.' })
      router.refresh()
    })

  return (
    <>
      <PortalUsers clientId={clientId} users={users} pending={pending} run={run} />

      {engagements.length === 0 ? (
        <NewEngagement clientId={clientId} pending={pending} run={run} />
      ) : (
        engagements.map((e) => (
          <div key={e.id} style={{ marginTop: 22 }}>
            <div className="row between center wrap">
              <h2 style={{ fontSize: 17, fontFamily: 'var(--serif)' }}>{e.name}</h2>
              {e.verified_at && <span className="tag good">all phases verified</span>}
            </div>

            {phases
              .filter((p) => p.engagement_id === e.id)
              .map((p) => (
                <PhaseCard
                  key={p.id}
                  clientId={clientId}
                  phase={p}
                  deliverables={deliverables.filter((d) => d.phase_id === p.id)}
                  invoice={invoices.find((i) => i.phase_id === p.id) ?? null}
                  hasUsers={users.some((u) => u.active)}
                  pending={pending}
                  run={run}
                />
              ))}
          </div>
        ))
      )}

      {flash && (
        <p style={{ marginTop: 14, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
      )}
    </>
  )
}

function PortalUsers({
  clientId,
  users,
  pending,
  run,
}: {
  clientId: string
  users: ClientUser[]
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-h between">
        <h3>Portal access</h3>
        <button className="btn sm" onClick={() => setOpen(!open)}>
          {open ? 'Close' : '+ Invite someone'}
        </button>
      </div>
      <div className="card-b">
        {open && (
          <div className="row wrap" style={{ gap: 8, marginBottom: 14 }}>
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ ...field, flex: '2 1 200px' }} />
            <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...field, flex: '1 1 140px' }} />
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...field, flex: '1 1 140px' }} />
            <button
              className="btn ox"
              disabled={pending || !email.trim()}
              onClick={() =>
                run(async () => {
                  const res = await inviteClientUser({ clientId, email, name, title })
                  if (res.ok) {
                    setEmail('')
                    setName('')
                    setTitle('')
                    setOpen(false)
                  }
                  return res
                }, 'Invited — they sign in with a magic link at /login.')
              }
            >
              Invite
            </button>
          </div>
        )}

        {users.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>
            Nobody yet. A phase cannot be verified until someone here can sign in — that is
            the only account type allowed to do it.
          </p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="row between center" style={{ padding: '7px 0', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {u.name ?? u.email}
                  {u.title ? <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {u.title}</span> : null}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{u.email}</div>
              </div>
              <button
                className="btn sm"
                disabled={pending}
                onClick={() =>
                  run(
                    () => setClientUserActive({ clientId, userId: u.id, active: !u.active }),
                    u.active ? 'Access removed.' : 'Access restored.',
                  )
                }
              >
                {u.active ? 'Revoke' : 'Restore'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function NewEngagement({
  clientId,
  pending,
  run,
}: {
  clientId: string
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const [name, setName] = useState('Operations Platform')
  const [rows, setRows] = useState([
    { name: 'Foundations', amount: '', target: '' },
    { name: 'Build', amount: '', target: '' },
    { name: 'Launch', amount: '', target: '' },
  ])

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-h"><h3>Start an engagement</h3></div>
      <div className="card-b">
        <label className="eyebrow" style={{ display: 'block' }}>Engagement name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...field, marginBottom: 14 }} />

        <div className="row between center" style={{ marginBottom: 7 }}>
          <label className="eyebrow" style={{ margin: 0 }}>Phases — each one bills when the client verifies it</label>
          <button className="btn sm" onClick={() => setRows([...rows, { name: '', amount: '', target: '' }])}>
            + Phase
          </button>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="row" style={{ gap: 7, marginBottom: 7 }}>
            <input
              placeholder="Phase name"
              value={r.name}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              style={{ ...field, flex: '2 1 170px' }}
            />
            <input
              placeholder="Amount ($)"
              inputMode="decimal"
              value={r.amount}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
              style={{ ...field, flex: '1 1 110px' }}
            />
            <input
              type="date"
              value={r.target}
              onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, target: e.target.value } : x)))}
              style={{ ...field, flex: '1 1 140px' }}
            />
            <button className="btn sm" onClick={() => setRows(rows.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}

        <button
          className="btn ox"
          style={{ marginTop: 12 }}
          disabled={pending}
          onClick={() =>
            run(
              () =>
                createEngagement({
                  clientId,
                  name,
                  phases: rows.map((r) => ({
                    name: r.name,
                    amountCents: Math.round(Number(r.amount || 0) * 100),
                    targetOn: r.target || null,
                  })),
                }),
              'Engagement created.',
            )
          }
        >
          {pending ? 'Creating…' : 'Create engagement'}
        </button>
      </div>
    </div>
  )
}

function PhaseCard({
  clientId,
  phase,
  deliverables,
  invoice,
  hasUsers,
  pending,
  run,
}: {
  clientId: string
  phase: Phase
  deliverables: Deliverable[]
  invoice: InvoiceLite | null
  hasUsers: boolean
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string; warning?: string }>, okText: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(phase.name)
  const [brief, setBrief] = useState(phase.brief_md)
  const [status, setStatus] = useState(phase.status)
  const [target, setTarget] = useState(phase.target_on ?? '')
  const [amount, setAmount] = useState(String(phase.amount_cents / 100))
  const [newDeliverable, setNewDeliverable] = useState('')

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="card-h between">
        <div className="row center" style={{ gap: 9 }}>
          <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>{phase.position}</span>
          <h3>{phase.name}</h3>
          <span className={`tag ${PHASE_TAG[phase.status] ?? 'hold'}`}>{phase.status.replace('_', ' ')}</span>
        </div>
        <div className="row center" style={{ gap: 8 }}>
          <span className="mono" style={{ fontSize: 12 }}>{formatMoney(phase.amount_cents)}</span>
          <button className="btn sm" onClick={() => setEditing(!editing)}>{editing ? 'Close' : 'Edit'}</button>
        </div>
      </div>
      <div className="card-b">
        {phase.verified_at ? (
          <div style={{ marginBottom: 12 }}>
            <span className="tag good">
              ✓ Verified live {phase.verified_at.slice(0, 10)} by {phase.verified_by}
            </span>
            {phase.verify_note && (
              <div style={{ marginTop: 5, color: 'var(--muted)' }}>“{phase.verify_note}”</div>
            )}
          </div>
        ) : (
          <div className="row between center wrap" style={{ gap: 10, marginBottom: 12 }}>
            <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
              {phase.status === 'in_review'
                ? 'Waiting on the client to verify. You cannot do this for them.'
                : 'Not yet in review.'}
            </span>
            <button
              className="btn sm"
              disabled={pending || phase.status === 'in_review' || !hasUsers}
              title={!hasUsers ? 'Invite a portal user first' : ''}
              onClick={() =>
                run(() => requestVerification({ clientId, phaseId: phase.id }), 'Client asked to verify.')
              }
            >
              Ask client to verify
            </button>
          </div>
        )}

        {invoice && (
          <div className="prov" style={{ marginBottom: 12 }}>
            invoice <b>{invoice.number}</b> · {invoice.status} · {invoice.amount}
          </div>
        )}

        {editing ? (
          <>
            <div className="row wrap" style={{ gap: 8, marginBottom: 8 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...field, flex: '2 1 180px' }} />
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...field, flex: '1 1 130px' }}>
                {PHASE_STATUSES.map((s) => (
                  <option key={s} value={s} disabled={s === 'verified'}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} style={{ ...field, flex: '1 1 140px' }} />
              <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} style={{ ...field, flex: '1 1 110px' }} />
            </div>
            <textarea
              rows={5}
              value={brief}
              placeholder="The phase brief — what this delivers, and what 'live' means for it."
              onChange={(e) => setBrief(e.target.value)}
              style={{ ...field, resize: 'vertical', marginBottom: 10 }}
            />
            <button
              className="btn ox"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    savePhase({
                      clientId,
                      phaseId: phase.id,
                      name,
                      briefMd: brief,
                      status,
                      targetOn: target || null,
                      amountCents: Math.round(Number(amount || 0) * 100),
                    }),
                  'Phase saved.',
                )
              }
            >
              Save phase
            </button>
          </>
        ) : (
          phase.brief_md && (
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--body)', marginBottom: 12 }}>{phase.brief_md}</p>
          )
        )}

        <div style={{ marginTop: 14 }}>
          <label className="eyebrow" style={{ display: 'block' }}>Deliverables</label>
          {deliverables.map((d) => (
            <div key={d.id} className="row between center" style={{ gap: 8, padding: '5px 0' }}>
              <div className="row center" style={{ gap: 8, flex: 1 }}>
                <select
                  value={d.status}
                  onChange={(e) =>
                    run(
                      () =>
                        saveDeliverable({
                          clientId,
                          phaseId: phase.id,
                          deliverableId: d.id,
                          name: d.name,
                          detail: d.detail ?? '',
                          status: e.target.value,
                        }),
                      'Updated.',
                    )
                  }
                  style={{ ...field, width: 110, padding: '4px 8px', fontSize: 12 }}
                >
                  {DELIVERABLE_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span style={{ fontSize: 13 }}>{d.name}</span>
              </div>
              <button
                className="btn sm"
                disabled={pending}
                onClick={() => run(() => deleteDeliverable({ clientId, deliverableId: d.id }), 'Removed.')}
              >
                ×
              </button>
            </div>
          ))}

          <div className="row" style={{ gap: 7, marginTop: 8 }}>
            <input
              placeholder="Add a deliverable"
              value={newDeliverable}
              onChange={(e) => setNewDeliverable(e.target.value)}
              style={{ ...field, flex: 1 }}
            />
            <button
              className="btn sm"
              disabled={pending || !newDeliverable.trim()}
              onClick={() =>
                run(async () => {
                  const res = await saveDeliverable({
                    clientId,
                    phaseId: phase.id,
                    name: newDeliverable,
                    detail: '',
                    status: 'todo',
                  })
                  if (res.ok) setNewDeliverable('')
                  return res
                }, 'Added.')
              }
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
