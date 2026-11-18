/**
 * The "an invoice is ready to send" reminder.
 *
 * The queue already drafts a day ahead and annotates its GitHub Actions run. That
 * is not a place anybody looks, which makes it the same as no reminder at all — the
 * failure this whole piece of work started from was a signed engagement sitting
 * untouched for ten days because nothing said anything was waiting.
 *
 * So it goes to the inbox. It does not send the invoice, and it carries no payment
 * link: it is addressed to Jackee, not the client, and sending stays a deliberate
 * act because invoices 1 and 3 are triggered by a session actually happening and
 * only a person knows whether it did.
 */

import { JACKEE_EMAILS, row } from './booking-emails'

export { JACKEE_EMAILS }

export type DraftedInvoice = {
  number: string
  description: string
  subtotalCents: number
  taxCents: number
  totalCents: number
  /** The date the invoice is meant to go out — the day after this reminder. */
  sendOn: string
  phaseName: string
}

const cad = (cents: number) =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(cents / 100)

export function draftedSubject(invoices: DraftedInvoice[]): string {
  if (invoices.length === 1) {
    return `Ready to send: ${invoices[0].number} — ${cad(invoices[0].totalCents)}`
  }
  const total = invoices.reduce((s, i) => s + i.totalCents, 0)
  return `${invoices.length} invoices ready to send — ${cad(total)}`
}

/**
 * Deliberately shows the full breakdown rather than a single figure, because the
 * breakdown is the thing worth checking before it goes to a client: the GST line is
 * what makes the document claimable, and this is the last look before it does.
 */
export function draftedHtml(invoices: DraftedInvoice[], hubUrl: string): string {
  const blocks = invoices
    .map(
      (i) => `
  <div style="background:#FFF8F0;border-left:4px solid #8B4513;padding:14px 18px;margin:0 0 14px;">
    <div style="font-size:15px;font-weight:bold;color:#8B4513;margin-bottom:8px;">
      ${i.number} · ${cad(i.totalCents)}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;">
${row('For', i.phaseName)}
${row('Description', i.description)}
${row('Subtotal', cad(i.subtotalCents))}
${row('GST (5%)', cad(i.taxCents))}
${row('Total', `<strong>${cad(i.totalCents)}</strong>`)}
${row('Send on', i.sendOn)}
    </table>
  </div>`,
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; font-size: 14px; }
  .note { color: #666; font-size: 12.5px; }
</style></head>
<body>
  <p><strong>${invoices.length === 1 ? 'An invoice is' : `${invoices.length} invoices are`} drafted and ready to send.</strong></p>

  <p class="note">
    Drafted a day ahead so there is time to check ${invoices.length === 1 ? 'it' : 'them'}.
    Nothing has been sent and nothing has reached Square — issuing is still yours to do.
  </p>

  ${blocks}

  <p>
    <a href="${hubUrl}/financials" style="display:inline-block;background:#8B4513;color:#ffffff;text-decoration:none;padding:12px 26px;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">
      Open Financials →
    </a>
  </p>

  <p class="note">
    Pressing Issue creates the invoice in Square and produces the payment link the
    client uses. If the work this bills has not actually happened yet, do not send it.
  </p>
</body>
</html>`
}
