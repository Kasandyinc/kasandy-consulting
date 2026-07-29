'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  isFrozen,
  proposalBlockers,
  proposalTotalCents,
  type Proposal,
  type ProposalModule,
  type ProposalSignature,
  type ServiceModule,
} from '@/lib/engine/delivery'
import { formatMoney } from '@/lib/engine/money'
import {
  createProposal,
  setProposalModules,
  saveProposal,
  generateBlueprint,
  sendProposal,
  withdrawProposal,
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

const STATUS_TAG: Record<string, string> = {
  draft: 'warn',
  sent: 'info',
  accepted: 'good',
  declined: 'bad',
  expired: 'hold',
}

type ContactView = { id: string; name: string | null; email: string | null; title: string | null }

export default function ProposalBuilder({
  orgId,
  orgName,
  proposal,
  chosen,
  catalogue,
  contacts,
  signature,
}: {
  orgId: string
  orgName: string
  proposal: Proposal | null
  chosen: ProposalModule[]
  catalogue: ServiceModule[]
  contacts: ContactView[]
  signature: ProposalSignature | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setFlash({ ok: res.ok, text: res.ok ? okText : res.error ?? 'Failed.' })
      router.refresh()
    })

  if (!proposal) {
    return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-b" style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ color: 'var(--muted)', marginBottom: 14 }}>
            No proposal for {orgName} yet.
          </p>
          <button
            className="btn ox"
            disabled={pending}
            onClick={() => run(() => createProposal(orgId), 'Draft created.')}
          >
            {pending ? 'Creating…' : 'Start a proposal'}
          </button>
          {flash && (
            <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Header
        proposal={proposal}
        signature={signature}
        contacts={contacts}
        chosen={chosen}
        pending={pending}
        run={run}
        orgId={orgId}
      />

      <div className="grid g2" style={{ marginTop: 16, alignItems: 'start' }}>
        <ModuleChecklist
          orgId={orgId}
          proposal={proposal}
          chosen={chosen}
          catalogue={catalogue}
          pending={pending}
          run={run}
        />
        <Document orgId={orgId} proposal={proposal} pending={pending} run={run} />
      </div>

      {flash && (
        <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.text}</p>
      )}
    </>
  )
}

function Header({
  proposal,
  signature,
  contacts,
  chosen,
  pending,
  run,
  orgId,
}: {
  proposal: Proposal
  signature: ProposalSignature | null
  contacts: ContactView[]
  chosen: ProposalModule[]
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
  orgId: string
}) {
  const [contactId, setContactId] = useState(contacts.find((c) => c.email)?.id ?? '')
  const recipient = contacts.find((c) => c.id === contactId)
  const blockers = proposalBlockers(proposal, chosen, recipient?.email ?? null)

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-h between">
        <div className="row center" style={{ gap: 10 }}>
          <h3 className="mono">{proposal.number}</h3>
          <span className={`tag ${STATUS_TAG[proposal.status]}`}>{proposal.status}</span>
          {isFrozen(proposal.status) && <span className="tag hold">🔒 frozen</span>}
        </div>
        <div className="row center" style={{ gap: 8 }}>
          <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
            {formatMoney(proposal.total_cents)}
          </span>
          {proposal.status !== 'draft' && (
            <button
              className="btn sm"
              onClick={() =>
                navigator.clipboard.writeText(`${window.location.origin}/proposal/${proposal.token}`)
              }
            >
              Copy client link
            </button>
          )}
        </div>
      </div>
      <div className="card-b">
        {signature ? (
          <div>
            <span className="tag good">
              ✓ Signed by {signature.signer_name} on {signature.signed_at.slice(0, 10)}
            </span>
            <div className="prov" style={{ marginTop: 6 }}>
              {signature.signer_email}
              {signature.signer_title ? ` · ${signature.signer_title}` : ''} · hash{' '}
              <b>{signature.document_hash.slice(0, 23)}…</b>
              {signature.ip ? ` · from ${signature.ip}` : ''}
            </div>
          </div>
        ) : proposal.status === 'sent' ? (
          <div className="row between center wrap" style={{ gap: 10 }}>
            <span style={{ color: 'var(--muted)' }}>
              Sent {proposal.sent_at?.slice(0, 10)} — waiting on their signature.
            </span>
            <button
              className="btn sm"
              disabled={pending}
              onClick={() => run(() => withdrawProposal({ orgId, proposalId: proposal.id }), 'Back to draft.')}
            >
              Withdraw to draft
            </button>
          </div>
        ) : (
          <>
            <label className="eyebrow" style={{ display: 'block' }}>Send to</label>
            <div className="row" style={{ gap: 8 }}>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                style={{ ...field, flex: 1 }}
              >
                {contacts.length === 0 && <option value="">No contacts on file</option>}
                {contacts.map((c) => (
                  <option key={c.id} value={c.id} disabled={!c.email}>
                    {c.name ?? 'Unnamed'}
                    {c.title ? ` · ${c.title}` : ''}
                    {c.email ? ` · ${c.email}` : ' · no email'}
                  </option>
                ))}
              </select>
              <button
                className="btn ox"
                disabled={pending || blockers.length > 0}
                onClick={() =>
                  run(
                    () => sendProposal({ orgId, proposalId: proposal.id, contactId }),
                    'Sent for signature.',
                  )
                }
              >
                {pending ? 'Sending…' : 'Send for signature'}
              </button>
            </div>

            {blockers.length > 0 && (
              <div className="err" style={{ marginTop: 12 }}>
                <strong>Not ready to send:</strong>
                <ul style={{ margin: '6px 0 0 18px' }}>
                  {blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ModuleChecklist({
  orgId,
  proposal,
  chosen,
  catalogue,
  pending,
  run,
}: {
  orgId: string
  proposal: Proposal
  chosen: ProposalModule[]
  catalogue: ServiceModule[]
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const frozen = isFrozen(proposal.status)
  const [picked, setPicked] = useState<string[]>(
    chosen.map((c) => c.module_id).filter((x): x is string => Boolean(x)),
  )

  const previewTotal = proposalTotalCents(
    catalogue.filter((m) => picked.includes(m.id)).map((m) => ({ price_cents: m.price_cents, quantity: 1 })),
  )
  const dirty =
    JSON.stringify([...picked].sort()) !==
    JSON.stringify(chosen.map((c) => c.module_id).filter(Boolean).sort())

  return (
    <div className="card">
      <div className="card-h between">
        <h3>Modules</h3>
        <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
          {formatMoney(previewTotal)}
        </span>
      </div>
      <div className="card-b">
        {catalogue.map((m) => (
          <label
            key={m.id}
            style={{
              display: 'block',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: 12,
              marginBottom: 9,
              cursor: frozen ? 'default' : 'pointer',
              background: picked.includes(m.id) ? 'var(--oxwash)' : '#fff',
              opacity: frozen ? 0.75 : 1,
            }}
          >
            <div className="row between center" style={{ gap: 10 }}>
              <div className="row center" style={{ gap: 9 }}>
                <input
                  type="checkbox"
                  disabled={frozen}
                  checked={picked.includes(m.id)}
                  onChange={(e) =>
                    setPicked(e.target.checked ? [...picked, m.id] : picked.filter((x) => x !== m.id))
                  }
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.code}</div>
                </div>
              </div>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>
                {formatMoney(m.price_cents)}
              </span>
            </div>
            {m.summary && (
              <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 6, marginLeft: 25 }}>
                {m.summary}
              </div>
            )}
          </label>
        ))}

        {!frozen && (
          <button
            className="btn ox"
            style={{ marginTop: 8 }}
            disabled={pending || !dirty}
            onClick={() =>
              run(
                () => setProposalModules({ orgId, proposalId: proposal.id, moduleIds: picked }),
                'Modules updated.',
              )
            }
          >
            {dirty ? 'Save selection' : 'Saved'}
          </button>
        )}
      </div>
    </div>
  )
}

function Document({
  orgId,
  proposal,
  pending,
  run,
}: {
  orgId: string
  proposal: Proposal
  pending: boolean
  run: (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => void
}) {
  const frozen = isFrozen(proposal.status)
  const [tab, setTab] = useState<'blueprint' | 'terms'>('blueprint')
  const [title, setTitle] = useState(proposal.title)
  const [blueprint, setBlueprint] = useState(proposal.blueprint_md)
  const [terms, setTerms] = useState(proposal.terms_md)
  const [deposit, setDeposit] = useState(String(proposal.deposit_cents / 100))
  const [validUntil, setValidUntil] = useState(proposal.valid_until ?? '')

  return (
    <div className="card">
      <div className="card-h between">
        <div className="row" style={{ gap: 2 }}>
          <button
            className={`tab${tab === 'blueprint' ? ' on' : ''}`}
            style={{ padding: '4px 10px' }}
            onClick={() => setTab('blueprint')}
          >
            Blueprint
          </button>
          <button
            className={`tab${tab === 'terms' ? ' on' : ''}`}
            style={{ padding: '4px 10px' }}
            onClick={() => setTab('terms')}
          >
            Terms
          </button>
        </div>
        {!frozen && (
          <button
            className="btn sm ai"
            disabled={pending}
            onClick={() => run(() => generateBlueprint({ orgId, proposalId: proposal.id }), 'Blueprint composed.')}
          >
            ✨ Compose
          </button>
        )}
      </div>
      <div className="card-b">
        {frozen && (
          <p className="tag hold" style={{ marginBottom: 12 }}>
            Frozen — the client has this document. Withdraw to a draft to change it.
          </p>
        )}

        <input
          value={title}
          disabled={frozen}
          onChange={(e) => setTitle(e.target.value)}
          style={{ ...field, fontWeight: 600, marginBottom: 10 }}
        />

        <textarea
          rows={18}
          disabled={frozen}
          value={tab === 'blueprint' ? blueprint : terms}
          onChange={(e) => (tab === 'blueprint' ? setBlueprint(e.target.value) : setTerms(e.target.value))}
          placeholder={
            tab === 'blueprint'
              ? 'What you found, what you will build, what it costs.'
              : 'The terms this signature is against.'
          }
          style={{ ...field, fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.6, resize: 'vertical' }}
        />

        <div className="row" style={{ gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="eyebrow" style={{ display: 'block' }}>Deposit ($)</label>
            <input
              value={deposit}
              disabled={frozen}
              onChange={(e) => setDeposit(e.target.value)}
              inputMode="decimal"
              style={field}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="eyebrow" style={{ display: 'block' }}>Valid until</label>
            <input
              type="date"
              value={validUntil}
              disabled={frozen}
              onChange={(e) => setValidUntil(e.target.value)}
              style={field}
            />
          </div>
        </div>

        {!frozen && (
          <button
            className="btn ox"
            style={{ marginTop: 14 }}
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  saveProposal({
                    orgId,
                    proposalId: proposal.id,
                    title,
                    blueprintMd: blueprint,
                    termsMd: terms,
                    depositCents: Math.round(Number(deposit || 0) * 100),
                    validUntil: validUntil || null,
                  }),
                'Saved.',
              )
            }
          >
            {pending ? 'Saving…' : 'Save document'}
          </button>
        )}
      </div>
    </div>
  )
}
