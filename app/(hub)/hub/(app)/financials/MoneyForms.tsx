'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, issueInvoice, recordPayment } from './actions'

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
            const res = await issueInvoice(invoiceId)
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
