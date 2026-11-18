'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvoice } from './actions'
import type { PaymentInstruction } from '@/lib/engine/invoice'

/**
 * Accepting an invoice, and the three ways to pay it.
 *
 * Accepting is "I agree to pay this". It is deliberately not the same act as
 * verifying a phase, which says the work was delivered — an invoice for a booked
 * session arrives before the session, and asking a client to certify a delivery that
 * has not happened would put a false record in a file her funder audits.
 *
 * Only the card is a button. Interac and EFT have no API for receiving money, so
 * what looks like a missing integration is the integration: the right address, the
 * right reference, rendered where she will read it.
 */
export default function AcceptPanel({
  invoiceId,
  invoiceNumber,
  acceptedAt,
  status,
  instructions,
}: {
  invoiceId: string
  invoiceNumber: string
  acceptedAt: string | null
  status: string
  instructions: PaymentInstruction[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  const card = instructions.find((i) => i.method === 'card')
  const etransfer = instructions.find((i) => i.method === 'e_transfer')
  const eft = instructions.find((i) => i.method === 'eft')

  const live = status !== 'draft' && status !== 'void'

  return (
    <div
      style={{
        border: '1px solid var(--line)',
        borderRadius: 8,
        padding: 14,
        marginTop: 10,
        background: 'var(--paper)',
      }}
    >
      {/* ── Accept ──────────────────────────────────────────────────────── */}
      {live && !acceptedAt && (
        <div className="row between center wrap" style={{ gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            Accepting records that you agree to pay this. It is separate from
            confirming the work was delivered, which comes after.
          </span>
          <button
            className="btn ox"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError('')
                const res = await acceptInvoice({ invoiceId })
                if (!res.ok) setError(res.error ?? 'Could not record that.')
                router.refresh()
              })
            }
          >
            {pending ? 'Recording…' : `Accept ${invoiceNumber}`}
          </button>
        </div>
      )}

      {acceptedAt && (
        <div style={{ fontSize: 12.5, color: 'var(--good)', marginBottom: 12 }}>
          Accepted {new Date(acceptedAt).toLocaleDateString('en-CA')}.
        </div>
      )}

      {error && (
        <div className="err" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* ── Pay ─────────────────────────────────────────────────────────── */}
      <div
        className="mono"
        style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}
      >
        WAYS TO PAY
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        {card?.kind === 'link' && (
          <div className="row between center wrap" style={{ gap: 8 }}>
            <span style={{ fontSize: 13 }}>
              <strong>Card</strong> — pay online, processed by Square
            </span>
            <a className="btn ox" href={card.url} target="_blank" rel="noreferrer">
              Pay by card →
            </a>
          </div>
        )}
        {card?.kind === 'unavailable' && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            <strong>Card</strong> — {card.note}
          </div>
        )}

        {etransfer?.kind === 'instructions' && (
          <div style={{ fontSize: 13 }}>
            <strong>Interac e-Transfer</strong>
            <div style={{ marginTop: 4, lineHeight: 1.7 }}>
              Send to{' '}
              <span className="mono" style={{ fontSize: 12.5 }}>
                {etransfer.recipient}
              </span>
              <br />
              Put{' '}
              <span className="mono" style={{ fontSize: 12.5 }}>
                {etransfer.message}
              </span>{' '}
              in the message — it is how we match your payment to this invoice.
              <br />
              <span style={{ color: 'var(--muted)' }}>{etransfer.note}</span>
            </div>
          </div>
        )}
        {etransfer?.kind === 'unavailable' && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            <strong>Interac e-Transfer</strong> — {etransfer.note}
          </div>
        )}

        {eft?.kind === 'instructions' && (
          <div style={{ fontSize: 13 }}>
            <strong>EFT / bank transfer</strong>
            <pre
              className="mono"
              style={{
                fontSize: 12,
                marginTop: 4,
                whiteSpace: 'pre-wrap',
                background: '#fff',
                border: '1px solid var(--line)',
                borderRadius: 6,
                padding: '8px 10px',
              }}
            >
              {eft.details}
            </pre>
          </div>
        )}
        {eft?.kind === 'on_request' && (
          <div style={{ fontSize: 12.5 }}>
            <strong>EFT / bank transfer</strong>{' '}
            <span style={{ color: 'var(--muted)' }}>— {eft.note}</span>
          </div>
        )}
      </div>
    </div>
  )
}
