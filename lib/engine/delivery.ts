/**
 * Types and small rules for the delivery path: booking → intake → discovery →
 * assessment → proposal → signature.
 *
 * The money arithmetic here is integer cents throughout, for the same reason the
 * rest of the platform is: a proposal total that is out by a rounding cent is a
 * proposal somebody argues about.
 */

export type BookingStatus = 'requested' | 'confirmed' | 'held' | 'done' | 'no_show' | 'cancelled'
export type IntakeStatus = 'sent' | 'started' | 'submitted'
export type FindingSeverity = 'critical' | 'material' | 'minor' | 'strength'
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Requested',
  confirmed: 'Confirmed',
  held: 'Held',
  done: 'Done',
  no_show: 'No-show',
  cancelled: 'Cancelled',
}

export const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  critical: 'Critical',
  material: 'Material',
  minor: 'Minor',
  strength: 'Strength',
}

/** Findings sort worst-first; strengths sit at the bottom where they read as context. */
export const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0,
  material: 1,
  minor: 2,
  strength: 3,
}

export type Booking = {
  id: string
  org_id: string | null
  contact_id: string | null
  name: string
  email: string
  phone: string | null
  organisation: string | null
  topic: string | null
  starts_at: string
  duration_mins: number
  timezone: string
  status: BookingStatus
  meeting_link: string | null
  source: string
  notes: string | null
  cancelled_reason: string | null
}

export type IntakeQuestion = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'email' | 'tel' | 'date'
  required: boolean
  options?: string[]
  help?: string
  order: number
}

export type Intake = {
  id: string
  org_id: string
  booking_id: string | null
  form_id: string | null
  status: IntakeStatus
  answers: Record<string, string>
  token: string
  sent_at: string | null
  submitted_at: string | null
}

export type DiscoveryFinding = {
  id: string
  discovery_id: string
  severity: FindingSeverity
  area: string | null
  finding: string
  evidence: string | null
  recommendation: string | null
  position: number
}

export type Discovery = {
  id: string
  org_id: string
  intake_id: string | null
  held_on: string | null
  summary: string | null
  systems_audit: { system: string; used_for: string; verdict?: string }[]
}

export type ServiceModule = {
  id: string
  code: string
  name: string
  summary: string | null
  price_cents: number
  unit: string
  active: boolean
  position: number
}

export type ProposalModule = {
  id: string
  proposal_id: string
  module_id: string | null
  name: string
  summary: string | null
  price_cents: number
  quantity: number
  position: number
}

export type Proposal = {
  id: string
  org_id: string
  discovery_id: string | null
  number: string
  title: string
  status: ProposalStatus
  blueprint_md: string
  terms_md: string
  currency: string
  total_cents: number
  deposit_cents: number
  valid_until: string | null
  sent_at: string | null
  decided_at: string | null
  decline_reason: string | null
  token: string
  contact_id: string | null
  preview_hash: string | null
  preview_opened_at: string | null
}

export type ProposalSignature = {
  id: string
  proposal_id: string
  signer_name: string
  signer_email: string
  signer_title: string | null
  signed_at: string
  ip: string | null
  document_hash: string
}

/** A proposal is frozen once the client has seen it. Mirrors the DB trigger. */
export function isFrozen(status: ProposalStatus): boolean {
  return status === 'sent' || status === 'accepted' || status === 'declined'
}

export function proposalTotalCents(modules: Pick<ProposalModule, 'price_cents' | 'quantity'>[]): number {
  return modules.reduce((sum, m) => sum + m.price_cents * m.quantity, 0)
}

/**
 * The deposit KC asks for on signature. A third, rounded up to the dollar so the
 * number on the proposal is not a stray-cent figure.
 */
export function defaultDepositCents(totalCents: number): number {
  if (totalCents <= 0) return 0
  // Rounding up to the dollar can overshoot on a small total — a third of $0.01
  // rounds to $1.00 — so the total is the ceiling. A deposit larger than the
  // engagement would be nonsense on the proposal and wrong in the ledger.
  return Math.min(Math.ceil(totalCents / 3 / 100) * 100, totalCents)
}

/**
 * Why this proposal cannot go out yet. Same shape as the outreach send-gate: say
 * every reason at once rather than one at a time.
 *
 * Three checks were added for the document layer, each named in the brief as a hard
 * gate — none is a style preference:
 *
 * - gstNumber empty: a Canadian tax invoice without the supplier's GST registration
 *   number is not valid for the client to claim an input tax credit or a Public
 *   Service Body rebate. Grant-funded clients get audited on exactly this line.
 * - modules do not sum to total_cents: total_cents is denormalised from the modules
 *   at save time, which makes it correct today and says nothing about tomorrow — a
 *   direct edit to a module row, or a future code path that forgets to recompute,
 *   would otherwise send a document whose total and whose line items disagree with
 *   nobody noticing until a client does the arithmetic themselves.
 * - previewHash mismatch: an operator must have actually seen the rendered document —
 *   headings resolved, numbers reconciled — for the version being sent, not some
 *   earlier draft of it. Comparing hashes rather than a boolean flag means any edit
 *   after the last Preview reopens this gate on its own, with nothing to remember to
 *   reset.
 */
export function proposalBlockers(
  proposal: Pick<Proposal, 'title' | 'blueprint_md' | 'terms_md' | 'total_cents' | 'status'>,
  modules: Pick<ProposalModule, 'price_cents' | 'quantity'>[],
  recipientEmail: string | null,
  gate?: { gstNumber: string | null; currentPreviewHash: string | null; savedPreviewHash: string | null },
): string[] {
  const reasons: string[] = []
  if (!proposal.title.trim()) reasons.push('No title')
  if (modules.length === 0) reasons.push('No modules selected')
  if (!proposal.blueprint_md.trim()) reasons.push('The Blueprint is empty')
  if (!proposal.terms_md.trim()) reasons.push('No terms attached — a signature needs something to be against')
  if (proposal.total_cents <= 0) reasons.push('Total is zero')
  if (!recipientEmail) reasons.push('No contact with an email address to send it to')
  if (proposal.status !== 'draft') reasons.push(`Already ${proposal.status}`)

  if (gate) {
    if (!gate.gstNumber?.trim()) {
      reasons.push(
        'No GST number on file — set settings.gst_number before this can go out; a tax invoice is not valid for a client\'s ITC or PSB rebate without it',
      )
    }
    const summed = proposalTotalCents(modules)
    if (summed !== proposal.total_cents) {
      // A local formatter rather than an import from lib/engine/money — this file is
      // dependency-free by design, and a blocker message showing raw cents would be
      // exactly the kind of number nobody double-checks by eye.
      const cad = (c: number) => `$${(c / 100).toFixed(2)}`
      reasons.push(
        `The modules sum to ${cad(summed)} but the proposal total reads ${cad(proposal.total_cents)} — these must agree before this can be sent`,
      )
    }
    if (!gate.savedPreviewHash || gate.savedPreviewHash !== gate.currentPreviewHash) {
      reasons.push('Preview has not been opened for the current version of this proposal')
    }
  }

  return reasons
}

/**
 * The hash recorded with a signature. It covers exactly what the signer was shown,
 * so a later edit to the stored document is detectable rather than deniable.
 */
export async function documentHash(blueprint: string, terms: string, totalCents: number): Promise<string> {
  const payload = `${blueprint}\n---TERMS---\n${terms}\n---TOTAL---\n${totalCents}`
  const bytes = new TextEncoder().encode(payload)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `sha256:${hex}`
}
