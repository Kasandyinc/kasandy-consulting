'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, recordPayment } from './actions'
import { issueInvoice, importSquareInvoice, markInvoicePaid } from './invoice-actions'

type ClientOpt = { id: string; name: string }
type InvoiceOpt = { id: string; number: string; status: string; balance: string }

const field: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--line)',
  borderRadius: 8,
  background: 'var(--paper)',
  color: 'var(--ink)',
  fontSize: 13,
  fontFamily: 'inherit',
}

export default function MoneyForms({
  clients,
  invoices,
}: {
  clients: ClientOpt[]
  invoices: InvoiceOpt[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [open, setOpen] = useState<'invoice' | 'payment' | null>(null)

  const [inv, setInv] = useState({
    clientId: '',
    number: '',
    description: '',
    amount: '',
    dueOn: '',
    requiresVerification: false,
  })
  const [pay, setPay] = useState({
    invoiceId: '',
    amount: '',
    method: 'e_transfer' as 'e_transfer' | 'cheque' | 'other',
    receivedOn: new Date().toISOString().slice(0, 10),
    reference: '',
  })

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) =>
    start(async () => {
      const res = await fn()
      setMsg({ ok: res.ok, text: res.ok ? okText : (res.error ?? 'Refused.') })
      if (res.ok) { setOpen(null); router.refresh() }
    })

  if (clients.length === 0) {
    return (
      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-b">
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Invoicing opens when there is a client to bill. There are none yet — a
            prospect becomes a client when an engagement is signed, in Phase 3.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn sm ox" onClick={() => { setOpen(open === 'invoice' ? null : 'invoice'); setMsg(null) }}>
          + New invoice
        </button>
        <button
          className="btn sm"
          disabled={invoices.length === 0}
          onClick={() => { setOpen(open === 'payment' ? null : 'payment'); setMsg(null) }}
        >
          Record e-transfer / cheque
        </button>
      </div>

      {msg && (
        <p style={{ marginTop: 10, color: msg.ok ? 'var(--good)' : 'var(--bad)', fontSize: 13 }}>
          {msg.text}
        </p>
      )}

      {open === 'invoice' && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-h"><h3>New invoice</h3></div>
          <div className="card-b" style={{ display: 'grid', gap: 12 }}>
            <select style={field} value={inv.clientId} onChange={(e) => setInv({ ...inv, clientId: e.target.value })}>
              <option value="">Select a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="grid g2" style={{ gap: 12 }}>
              <input style={field} placeholder="Invoice number, e.g. KC-2026-001"
                value={inv.number} onChange={(e) => setInv({ ...inv, number: e.target.value })} />
              <input style={field} placeholder="Amount, e.g. 5000"
                value={inv.amount} onChange={(e) => setInv({ ...inv, amount: e.target.value })} />
            </div>
            <input style={field} placeholder="Description"
              value={inv.description} onChange={(e) => setInv({ ...inv, description: e.target.value })} />
            <div className="grid g2" style={{ gap: 12, alignItems: 'center' }}>
              <input style={field} type="date" value={inv.dueOn}
                onChange={(e) => setInv({ ...inv, dueOn: e.target.value })} />
              <label style={{ fontSize: 12.5, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={inv.requiresVerification}
                  onChange={(e) => setInv({ ...inv, requiresVerification: e.target.checked })} />
                Milestone — release on “Verified live”
              </label>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Saved as a draft. A milestone invoice cannot be issued until the client
              marks the phase verified — the database enforces that, not this form.
            </p>
            <button className="btn ox" disabled={pending || !inv.clientId}
              onClick={() => run(() => createInvoice(inv), 'Invoice created as a draft.')}>
              {pending ? 'Saving…' : 'Create draft invoice'}
            </button>
          </div>
        </div>
      )}

      {open === 'payment' && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-h"><h3>Record a payment</h3></div>
          <div className="card-b" style={{ display: 'grid', gap: 12 }}>
            <select style={field} value={pay.invoiceId} onChange={(e) => setPay({ ...pay, invoiceId: e.target.value })}>
              <option value="">Select an invoice…</option>
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>{i.number} — {i.balance} outstanding</option>
              ))}
            </select>
            <div className="grid g2" style={{ gap: 12 }}>
              <input style={field} placeholder="Amount, e.g. 2500"
                value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <select style={field} value={pay.method}
                onChange={(e) => setPay({ ...pay, method: e.target.value as typeof pay.method })}>
                <option value="e_transfer">e-Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid g2" style={{ gap: 12 }}>
              <input style={field} type="date" value={pay.receivedOn}
                onChange={(e) => setPay({ ...pay, receivedOn: e.target.value })} />
              <input style={field} placeholder="Reference"
                value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>
              Card payments arrive from Square automatically. This is for money that
              does not — it reconciles against QuickBooks the same way.
            </p>
            <button className="btn ox" disabled={pending || !pay.invoiceId}
              onClick={() => run(() => recordPayment(pay), 'Payment recorded.')}>
              {pending ? 'Recording…' : 'Record payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Issue a draft invoice — surfaces the database's refusal verbatim when gated. */
export function IssueButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  return (
    <>
      <button
        className="btn sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await issueInvoice({ invoiceId })
            if (!res.ok) setError(res.error ?? 'Refused.')
            else { setError(''); router.refresh() }
          })
        }
      >
        {pending ? '…' : 'Issue'}
      </button>
      {error && (
        <div style={{ color: 'var(--bad)', fontSize: 11, marginTop: 4, maxWidth: 280 }}>{error}</div>
      )}
    </>
  )
}

/**
 * Link an invoice to one that already exists in Square.
 *
 * The deposit for the first client was raised by hand in the Square dashboard while
 * this path was being built. Square holds it; this reconciles the platform row to
 * it. Creating a second invoice instead would put two documents for the same amount
 * in front of a client who submits receipts to a funder.
 */
export function ImportSquareButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [squareId, setSquareId] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (!open) {
    return (
      <button className="btn sm" onClick={() => setOpen(true)} title="Link to an invoice already in Square">
        Link Square
      </button>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 260 }}>
      <input
        value={squareId}
        onChange={(e) => setSquareId(e.target.value)}
        placeholder="Square invoice id"
        style={{ fontSize: 12.5 }}
      />
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn sm ox"
          disabled={pending || !squareId.trim()}
          onClick={() =>
            start(async () => {
              const res = await importSquareInvoice({ invoiceId, squareInvoiceId: squareId.trim() })
              setMsg({ ok: !!res.ok, text: res.ok ? 'Linked.' : res.error ?? 'Failed.' })
              if (res.ok) { setOpen(false); router.refresh() }
            })
          }
        >
          {pending ? 'Linking…' : 'Link'}
        </button>
        <button className="btn sm" onClick={() => { setOpen(false); setMsg(null) }}>Cancel</button>
      </div>
      {msg && (
        <div style={{ fontSize: 11, color: msg.ok ? 'var(--good)' : 'var(--bad)' }}>{msg.text}</div>
      )}
    </div>
  )
}

/**
 * Record a payment that arrived outside Square, and push it back to Square.
 *
 * The push is what keeps the two systems agreeing. Without it Square shows a
 * permanently unpaid invoice and the reconciliation downstream never balances —
 * which is discovered at year end, when the evidence is months old. If the push
 * fails the payment is still recorded here and the warning says so explicitly,
 * because an unfinished reconciliation that looks finished is the worse outcome.
 */
export function MarkPaidButton({
  invoiceId,
  amountCents,
}: {
  invoiceId: string
  amountCents: number
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState((amountCents / 100).toFixed(2))
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState<'e_transfer' | 'eft' | 'cheque' | 'other'>('e_transfer')
  const [reference, setReference] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  if (!open) {
    return <button className="btn sm" onClick={() => setOpen(true)}>Mark as paid</button>
  }

  return (
    <div style={{ display: 'grid', gap: 6, minWidth: 280 }}>
      <div className="row" style={{ gap: 6 }}>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          style={{ fontSize: 12.5, width: 100 }}
        />
        <input
          type="date"
          value={receivedOn}
          onChange={(e) => setReceivedOn(e.target.value)}
          style={{ fontSize: 12.5 }}
        />
      </div>
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as typeof method)}
        style={{ fontSize: 12.5 }}
      >
        <option value="e_transfer">Interac e-Transfer</option>
        <option value="eft">EFT / bank transfer</option>
        <option value="cheque">Cheque</option>
        <option value="other">Other</option>
      </select>
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Reference (confirmation number)"
        style={{ fontSize: 12.5 }}
      />
      <div className="row" style={{ gap: 6 }}>
        <button
          className="btn sm ox"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await markInvoicePaid({ invoiceId, amount, receivedOn, method, reference })
              setMsg({
                ok: !!res.ok,
                text: res.ok
                  ? ('warning' in res && res.warning ? res.warning : 'Recorded, and Square updated.')
                  : res.error ?? 'Failed.',
              })
              if (res.ok) router.refresh()
            })
          }
        >
          {pending ? 'Recording…' : 'Record payment'}
        </button>
        <button className="btn sm" onClick={() => { setOpen(false); setMsg(null) }}>Cancel</button>
      </div>
      {msg && (
        <div style={{ fontSize: 11, color: msg.ok ? 'var(--good)' : 'var(--bad)', maxWidth: 300 }}>
          {msg.text}
        </div>
      )}
    </div>
  )
}
