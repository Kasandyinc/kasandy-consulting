'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, recordPayment } from './actions'
import {
  issueInvoice,
  importSquareInvoice,
  markInvoicePaid,
  findSquareCandidates,
} from './invoice-actions'

type SquareCandidate = {
  id: string
  number: string | null
  totalCents: number | null
  status: string
}

type FoundSquare = {
  amountCents: number
  matches: SquareCandidate[]
  others: SquareCandidate[]
}

const cadFromCents = (cents: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100)

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
export function IssueButton({
  invoiceId,
  label = 'Issue',
  title,
}: {
  invoiceId: string
  /**
   * 'Issue' for a draft. 'Create in Square' for an invoice already marked issued
   * that Square has never seen — pressing it finishes a job that was left half
   * done, and calling that "Issue" would read as sending the client a second
   * invoice.
   */
  label?: string
  title?: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  return (
    <>
      <button
        className="btn sm"
        disabled={pending}
        title={title}
        onClick={() =>
          start(async () => {
            const res = await issueInvoice({ invoiceId })
            if (!res.ok) setError(res.error ?? 'Refused.')
            else { setError(''); router.refresh() }
          })
        }
      >
        {pending ? '…' : label}
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
 *
 * This used to be a bare text box wanting a Square invoice id — a value that is
 * visible nowhere except the address bar of the Square dashboard. That is a high
 * enough price that it simply does not get paid: two invoices were raised in Square
 * and neither was ever linked, so the platform believed nothing had been sent and
 * the payment webhook had no row to match against. A control nobody can use is the
 * same as no control.
 *
 * So it asks Square instead. Opening it lists the open invoices there, with the
 * ones matching this amount offered first. The id box stays underneath, because an
 * invoice at another location or already paid will not be in the list and there has
 * to be a way through that does not involve waiting for a code change.
 */
export function ImportSquareButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [squareId, setSquareId] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [found, setFound] = useState<FoundSquare | null>(null)
  const [looking, setLooking] = useState(false)

  function openAndLook() {
    setOpen(true)
    setLooking(true)
    setMsg(null)
    start(async () => {
      const res = await findSquareCandidates({ invoiceId })
      setLooking(false)
      if (!res.ok) setMsg({ ok: false, text: res.error ?? 'Could not reach Square.' })
      else setFound(res as FoundSquare)
    })
  }

  function link(id: string) {
    start(async () => {
      const res = await importSquareInvoice({ invoiceId, squareInvoiceId: id })
      setMsg({ ok: !!res.ok, text: res.ok ? 'Linked.' : res.error ?? 'Failed.' })
      if (res.ok) { setOpen(false); router.refresh() }
    })
  }

  if (!open) {
    return (
      <button className="btn sm" onClick={openAndLook} title="Find this invoice in Square and link it">
        Find in Square
      </button>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 8, minWidth: 300 }}>
      {looking && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Asking Square…</div>}

      {found && found.matches.length > 0 && (
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {found.matches.length === 1 ? 'One open invoice in Square matches' : `${found.matches.length} open invoices in Square match`} {cadFromCents(found.amountCents)}:
          </div>
          {found.matches.map((m) => (
            <button
              key={m.id}
              className="btn sm ox"
              disabled={pending}
              onClick={() => link(m.id)}
              style={{ textAlign: 'left', fontSize: 12 }}
            >
              {m.number ? `${m.number} · ` : ''}{cadFromCents(m.totalCents ?? 0)} · {m.status.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      {found && found.matches.length === 0 && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          {/* Saying "no match" alone is indistinguishable from a broken picker.
              What Square actually holds is the answer to why. */}
          Nothing open in Square is {cadFromCents(found.amountCents)}.
          {found.others.length > 0 ? (
            <> Square has {found.others.map((o) => cadFromCents(o.totalCents ?? 0)).join(', ')} open — if one of those is this invoice, the amounts disagree and one of them is wrong.</>
          ) : (
            <> Square has no open invoices at this location.</>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Or paste a Square invoice id</div>
        <input
          value={squareId}
          onChange={(e) => setSquareId(e.target.value)}
          placeholder="Square invoice id"
          style={{ fontSize: 12.5 }}
        />
        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn sm"
            disabled={pending || !squareId.trim()}
            onClick={() => link(squareId.trim())}
          >
            {pending ? 'Linking…' : 'Link'}
          </button>
          <button className="btn sm" onClick={() => { setOpen(false); setMsg(null); setFound(null) }}>Cancel</button>
        </div>
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
