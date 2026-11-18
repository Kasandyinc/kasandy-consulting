/**
 * Money helpers (Phase 2).
 *
 * Amounts are integer cents everywhere. Floats never touch money: 0.1 + 0.2 is not
 * 0.3, and an invoice that is a cent out is a phone call with a client.
 */

export type InvoiceStatus =
  | 'draft'
  | 'awaiting_verification'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'void'

export type Invoice = {
  id: string
  number: string
  client_id: string
  engagement_id: string | null
  /** The phase this bills. At most one live invoice per phase, enforced by index. */
  phase_id: string | null
  description: string | null
  /**
   * The gross figure, and what is owed. `subtotal_cents + tax_cents` by database
   * constraint — the breakdown decomposes this rather than replacing it, so every
   * existing reader (tiles, aging, dunning) keeps working on the amount due.
   */
  amount_cents: number
  subtotal_cents: number
  tax_cents: number
  currency: string
  status: InvoiceStatus
  requires_verification: boolean
  issued_on: string | null
  due_on: string | null
  paid_at: string | null
  /** When the client agreed to pay. Not the same as the phase being verified. */
  accepted_at: string | null
  accepted_by: string | null
  square_invoice_id: string | null
  square_payment_url: string | null
  square_version: number | null
  show_bank_details: boolean
}

export type Payment = {
  id: string
  invoice_id: string
  amount_cents: number
  currency: string
  /**
   * 'card' is a card however it clears; 'square' is retired — it named the
   * processor rather than the method, and would have become a lie the day a card
   * was taken another way. Postgres cannot drop an enum value, so it stays in the
   * type and out of use.
   */
  method: 'card' | 'e_transfer' | 'eft' | 'cheque' | 'other' | 'square'
  received_on: string
  reference: string | null
  square_location_id: string | null
  /** Null when the payment came from Square; false when it still owes a push. */
  pushed_to_square: boolean | null
}

/** Format cents as currency. Never used for arithmetic — display only. */
export function formatMoney(cents: number, currency = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

export function paidCents(invoiceId: string, payments: Payment[]): number {
  return payments
    .filter((p) => p.invoice_id === invoiceId)
    .reduce((sum, p) => sum + p.amount_cents, 0)
}

export function balanceCents(invoice: Invoice, payments: Payment[]): number {
  return Math.max(0, invoice.amount_cents - paidCents(invoice.id, payments))
}

/** Whole days a live invoice is past due. Never negative; 0 when not yet due. */
export function daysOverdue(invoice: Invoice, today = new Date()): number {
  if (!invoice.due_on) return 0
  if (invoice.status === 'paid' || invoice.status === 'void' || invoice.status === 'draft') return 0
  const due = new Date(`${invoice.due_on}T00:00:00Z`)
  const now = new Date(
    `${today.toISOString().slice(0, 10)}T00:00:00Z`,
  )
  const diff = Math.floor((now.getTime() - due.getTime()) / 86_400_000)
  return diff > 0 ? diff : 0
}

/**
 * Which dunning reminder an invoice has earned. Square does not retry a declined
 * recurring charge, so the Engine owns this ladder rather than assuming the
 * processor chases payment.
 *
 * 0 means nothing is owed yet.
 */
export function dunningLevel(invoice: Invoice, today = new Date()): 0 | 1 | 2 | 3 | 4 {
  const d = daysOverdue(invoice, today)
  if (d <= 0) return 0
  if (d < 7) return 1
  if (d < 14) return 2
  if (d < 30) return 3
  return 4
}

/** Aging bucket for the receivables view. */
export function agingBucket(invoice: Invoice, today = new Date()): string {
  const d = daysOverdue(invoice, today)
  if (d === 0) return 'current'
  if (d <= 30) return '1–30'
  if (d <= 60) return '31–60'
  if (d <= 90) return '61–90'
  return '90+'
}

export type MoneySummary = {
  invoicedCents: number
  collectedCents: number
  outstandingCents: number
  overdueCents: number
}

/** Totals for the Financials tiles. Void invoices are excluded from every figure. */
export function summarise(invoices: Invoice[], payments: Payment[], today = new Date()): MoneySummary {
  const live = invoices.filter((i) => i.status !== 'void' && i.status !== 'draft')
  const invoicedCents = live.reduce((s, i) => s + i.amount_cents, 0)
  const collectedCents = live.reduce((s, i) => s + paidCents(i.id, payments), 0)
  const outstandingCents = live.reduce((s, i) => s + balanceCents(i, payments), 0)
  const overdueCents = live
    .filter((i) => daysOverdue(i, today) > 0)
    .reduce((s, i) => s + balanceCents(i, payments), 0)
  return { invoicedCents, collectedCents, outstandingCents, overdueCents }
}
