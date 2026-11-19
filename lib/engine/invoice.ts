/**
 * Tax invoices: the arithmetic, the gate, and the payment instructions.
 *
 * Dependency-free on purpose, like lib/engine/delivery.ts — this is the layer that
 * decides whether a document is lawful to issue, and it should be testable without a
 * database, a network or a React tree.
 *
 * Integer cents throughout. Floats never touch money here: 0.1 + 0.2 is not 0.3, and
 * an invoice that is a cent out is a phone call with a client who is reconciling it
 * against a funder's receipt.
 */

/** GST, as a rate in basis points. 5% federal. */
export const GST_BASIS_POINTS = 500

/**
 * GST on a subtotal, rounded half-up to the cent.
 *
 * Written out rather than using Math.round so the tax line can be checked by hand
 * against the document — which is what an auditor does.
 */
export function gstCents(subtotalCents: number, basisPoints = GST_BASIS_POINTS): number {
  if (!Number.isInteger(subtotalCents)) {
    throw new Error(`subtotalCents must be an integer number of cents, got ${subtotalCents}`)
  }
  if (subtotalCents <= 0) return 0
  return Math.floor((subtotalCents * basisPoints) / 10_000 + 0.5)
}

export type InvoiceAmounts = {
  subtotalCents: number
  taxCents: number
  totalCents: number
}

/** The three figures an invoice carries, derived from the one that is agreed. */
export function amountsFromSubtotal(
  subtotalCents: number,
  basisPoints = GST_BASIS_POINTS,
): InvoiceAmounts {
  const taxCents = gstCents(subtotalCents, basisPoints)
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents }
}

/**
 * Whether a stored invoice's three figures still agree.
 *
 * The database enforces `amount_cents = subtotal_cents + tax_cents`, so this is not
 * the only guard — but the database cannot know the tax RATE, and a row that adds up
 * while carrying the wrong GST is still a wrong tax invoice. Checked at render and
 * at issue, because those are the two moments the number leaves the building.
 */
export function amountsAgree(
  row: { subtotal_cents: number; tax_cents: number; amount_cents: number },
  basisPoints = GST_BASIS_POINTS,
): boolean {
  if (row.subtotal_cents + row.tax_cents !== row.amount_cents) return false
  return row.tax_cents === gstCents(row.subtotal_cents, basisPoints)
}

// ─── The gate ────────────────────────────────────────────────────────────────

export type InvoiceGateInput = {
  subtotal_cents: number
  tax_cents: number
  amount_cents: number
  status: string
  description: string | null
  due_on: string | null
}

const cad = (c: number) => `$${(c / 100).toFixed(2)}`

/**
 * Why this invoice cannot be issued yet. Every reason at once, same shape as
 * `proposalBlockers` — one at a time turns fixing it into a guessing game.
 *
 * The GST checks are hard gates, not style preferences, and they are the same
 * argument the proposal gate already makes: a Canadian tax invoice without the
 * supplier's GST registration number is not valid for the client to claim an input
 * tax credit or a Public Service Body rebate. The first client on this path is
 * grant-funded and submits these to a funder who audits them. An invoice she cannot
 * claim against is worse than no invoice, because she has already paid it.
 */
export function invoiceBlockers(
  invoice: InvoiceGateInput,
  gate: { gstNumber: string | null },
): string[] {
  const reasons: string[] = []

  if (!gate.gstNumber?.trim()) {
    reasons.push(
      "No GST number on file — set it in Settings before this can be issued; a tax invoice is not valid for the client's ITC or PSB rebate without it",
    )
  }

  if (invoice.amount_cents <= 0) reasons.push('Amount is zero')

  if (invoice.subtotal_cents + invoice.tax_cents !== invoice.amount_cents) {
    reasons.push(
      `The subtotal ${cad(invoice.subtotal_cents)} plus GST ${cad(invoice.tax_cents)} does not equal the total ${cad(invoice.amount_cents)}`,
    )
  } else if (invoice.tax_cents !== gstCents(invoice.subtotal_cents)) {
    reasons.push(
      `GST reads ${cad(invoice.tax_cents)} but 5% of ${cad(invoice.subtotal_cents)} is ${cad(gstCents(invoice.subtotal_cents))}`,
    )
  }

  if (!invoice.description?.trim()) {
    reasons.push('No description — a tax invoice has to say what it is for')
  }
  if (!invoice.due_on) reasons.push('No due date')
  if (invoice.status !== 'draft') reasons.push(`Already ${invoice.status}`)

  return reasons
}

/** Issue date plus 30 days, as an ISO date string. */
export function dueOnFrom(issuedOn: string, days = 30): string {
  const d = new Date(`${issuedOn}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

// ─── The queue ───────────────────────────────────────────────────────────────

/**
 * Whether a phase's invoice should be drafted today.
 *
 * Only Invoice 4 has a fixed calendar date in the SCN agreement. Phases 1 and 3 are
 * triggered by delivery of a session, so their date does not exist until the session
 * is booked — which is why `send_on` is nullable and why this returns false on null
 * rather than falling back to anything. A queue that guesses a date sends an invoice
 * for work that has not happened.
 */
export function shouldDraftToday(
  phase: { send_on: string | null },
  today: string,
  leadDays = 1,
): boolean {
  if (!phase.send_on) return false
  const send = new Date(`${phase.send_on}T00:00:00Z`)
  send.setUTCDate(send.getUTCDate() - leadDays)
  return send.toISOString().slice(0, 10) <= today
}

// ─── What releases a phase's invoice ─────────────────────────────────────────

export type BillingTrigger = 'on_schedule' | 'on_verification'

/**
 * Whether an invoice for this phase must wait for the client to verify delivery.
 *
 * Derived from the phase rather than typed into the invoice, so the two cannot
 * disagree. The database refuses the disagreement too, but a value that is computed
 * never has to be refused.
 *
 * 'on_verification' is the default and the safer one: nothing bills until the client
 * has the thing and says it works. 'on_schedule' exists because that rule is wrong
 * for a booked session — you pay to hold the date — and the alternative was asking a
 * client to certify delivery of a workshop that had not happened yet, which is not a
 * workaround but a false record.
 */
export function requiresVerification(phase: { billing_trigger: string }): boolean {
  return phase.billing_trigger !== 'on_schedule'
}

export type PhaseForBilling = {
  billing_trigger: string
  verified_at: string | null
  send_on: string | null
  name: string
}

/**
 * Why this phase cannot be invoiced yet, or an empty list.
 *
 * Separate from `invoiceBlockers`, which asks whether a document is a lawful tax
 * invoice. This asks whether we are entitled to bill for the work at all — and they
 * fail for different reasons, so collapsing them would hide one behind the other.
 */
export function billingBlockers(phase: PhaseForBilling, today: string): string[] {
  const reasons: string[] = []

  if (requiresVerification(phase)) {
    if (!phase.verified_at) {
      reasons.push(
        `"${phase.name}" bills on verification and the client has not marked it live yet`,
      )
    }
    return reasons
  }

  // on_schedule. The date is what entitles us to bill, so its absence is the blocker
  // — and a null one is never treated as "now", which would invoice for a session
  // nobody has booked.
  if (!phase.send_on) {
    reasons.push(
      `"${phase.name}" bills on schedule but has no date set yet — set one when the session is booked`,
    )
  }

  return reasons
}

// ─── The duplicate a person makes ────────────────────────────────────────────

export type SquareInvoiceSummary = {
  id: string
  number: string | null
  totalCents: number | null
  status: string
  paymentUrl: string | null
}

/**
 * Square invoices that could already be this one.
 *
 * The duplicate worth preventing is the one a person created. The commencement
 * deposit was raised by hand in the Square dashboard while this path was being
 * built: Square holds it, our `square_invoice_id` is null, and a check that reads
 * only our own column waves Issue straight through — so the client receives a
 * second invoice for the same amount, in a file her funder audits.
 *
 * Matching is on the total, not the number, because a dashboard-raised invoice
 * carries Square's own numbering and will never match ours.
 *
 * Pure, and here rather than beside the API calls, because it is the judgement
 * that decides whether a client gets billed twice — and a judgement that can only
 * be exercised by calling Square is one that never gets exercised.
 */
export function likelyDuplicates(
  candidates: SquareInvoiceSummary[],
  amountCents: number,
  alreadyLinkedIds: string[],
): SquareInvoiceSummary[] {
  const linked = new Set(alreadyLinkedIds)
  return candidates.filter((c) => c.totalCents === amountCents && !linked.has(c.id))
}

// ─── Payment instructions ────────────────────────────────────────────────────

export type PaymentInstructionSettings = {
  etransfer_email: string | null
  eft_details_md: string | null
  gst_number: string | null
}

export type PaymentInstruction =
  | { method: 'card'; kind: 'link'; url: string }
  | { method: 'card'; kind: 'unavailable'; note: string }
  | { method: 'e_transfer'; kind: 'instructions'; recipient: string; message: string; note: string }
  | { method: 'e_transfer'; kind: 'unavailable'; note: string }
  | { method: 'eft'; kind: 'instructions'; details: string }
  | { method: 'eft'; kind: 'on_request'; note: string }

/**
 * What the invoice document shows for each way of paying.
 *
 * Only the card is a link. Interac and EFT have no API for *receiving* — there is
 * nothing to integrate with, and pretending otherwise would produce a button that
 * does nothing. For those two the entire feature is rendering the right words, which
 * is why the addresses come from settings and never from a constant: the address on
 * an invoice is the address money goes to, and a hardcoded one is a redirection
 * waiting for a deploy.
 */
export function paymentInstructions(
  invoice: { number: string; show_bank_details: boolean },
  settings: PaymentInstructionSettings,
  squareUrl: string | null,
): PaymentInstruction[] {
  const out: PaymentInstruction[] = []

  out.push(
    squareUrl
      ? { method: 'card', kind: 'link', url: squareUrl }
      : {
          method: 'card',
          kind: 'unavailable',
          note: 'Card payment link not generated yet — issue this invoice to create it.',
        },
  )

  const etransfer = settings.etransfer_email?.trim()
  out.push(
    etransfer
      ? {
          method: 'e_transfer',
          kind: 'instructions',
          recipient: etransfer,
          // The invoice number in the message line is what lets a payment that
          // arrives as a bare email notification be matched to what it paid.
          message: invoice.number,
          note: 'Please use autodeposit — no security question is needed.',
        }
      : {
          method: 'e_transfer',
          kind: 'unavailable',
          note: 'No e-Transfer address on file — set it in Settings.',
        },
  )

  const eft = settings.eft_details_md?.trim()
  out.push(
    invoice.show_bank_details && eft
      ? { method: 'eft', kind: 'instructions', details: eft }
      : {
          method: 'eft',
          kind: 'on_request',
          // The default, deliberately. Invoice-redirection fraud works by presenting
          // plausible account numbers on a plausible invoice; every document carrying
          // real ones is another document worth intercepting.
          //
          // It used to say "reply to this invoice", which is no instruction at all to
          // a client reading this in the portal — there is nothing there to reply to.
          // It names the address instead, and that is the same finance mailbox the
          // e-Transfer goes to on purpose: a client who asks about a payment and a
          // client who sends one should reach the same place, because a question
          // answered somewhere else is how a payment ends up unmatched. It comes from
          // settings for the same reason the e-Transfer address does — an address
          // hardcoded here is a redirection waiting for a deploy.
          note: etransfer
            ? `Banking details for EFT are available on request — email ${etransfer}, quoting ${invoice.number}, and they will be sent separately.`
            : 'Banking details for EFT are available on request and will be sent separately.',
        },
  )

  return out
}
