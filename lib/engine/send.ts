import { Resend } from 'resend'
import { renderTemplate, withCaslFooter, greetingMismatch, type MergeContext } from './merge'
import { optOutUrl } from './optout'
import { sendBlockers, type Org, type Contact, type ConsentRow } from './types'
import { signatureFrom, signatureHtml, signatureText, bodyToHtml, stripSignOff, SIGN_OFF } from './signature'

export type SendCheck = {
  ready: boolean
  /** Every reason this cannot go out, in plain language. */
  reasons: string[]
  subject: string
  body: string
  /** Plain-text body with signature + CASL footer, exactly as it would be sent. */
  full: string
  /** The HTML that will actually be delivered, signature block included. */
  html: string
}

export type TemplateRow = {
  id: string
  slug: string
  name: string
  channel: string
  subject: string | null
  body_md: string | null
  active: boolean
  auto_send_enabled: boolean
}

export type SettingsRow = {
  mailing_address: string | null
  sending_address: string | null
  signature_md: string | null
  casl_footer_md: string | null
  phone: string | null
  signature_name?: string | null
  signature_role?: string | null
  signature_email?: string | null
  signature_tagline?: string | null
  signature_logo_url?: string | null
  booking_url?: string | null
}

/** The approved, per-org copy. When present it is what actually sends. */
export type DraftRow = {
  id: string
  step: string
  subjects: string[]
  body_md: string
}

/**
 * The full send-gate (§7.1), evaluated for preview. The database enforces the
 * structural rules regardless; this exists so the operator sees every reason before
 * clicking, rather than hitting a raw constraint error.
 */
export function checkSend(args: {
  org: Org
  contact: Contact | null
  contacts: Contact[]
  consent: ConsentRow[]
  template: TemplateRow | null
  settings: SettingsRow | null
  manualFills?: Record<string, string>
  /** Approved per-org copy; overrides the generic template body when present. */
  draft?: DraftRow | null
  /** Which of the draft's alternative subject lines to use. */
  subjectIndex?: number
}): SendCheck {
  const { org, contact, contacts, consent, template, settings, manualFills, draft } = args
  const reasons = sendBlockers(org, contacts, consent)

  if (!template) {
    return { ready: false, reasons: [...reasons, 'No template selected'], subject: '', body: '', full: '', html: '' }
  }
  if (!template.active) reasons.push(`Template ${template.id} is not active`)

  // The approved per-org draft is the copy of record; the generic template body is
  // only a fallback. If neither exists there is nothing to send.
  const bodySource = draft?.body_md?.trim() || template.body_md?.trim() || ''
  const subjectSource =
    draft?.subjects?.[args.subjectIndex ?? 0] || template.subject || ''
  if (!bodySource) {
    reasons.push(`No approved copy for ${template.id} yet — load the outreach drafts first`)
  }
  // An email with an empty subject line would still deliver, so block it here. The
  // E3 re-touch drafts carry no subject of their own (they read as a reply), so this
  // surfaces that rather than sending a blank-subject email.
  if (!subjectSource.trim()) {
    reasons.push(`No subject line in the approved copy for ${template.id} — add one before sending`)
  }
  if (!settings?.mailing_address?.trim()) {
    reasons.push('settings.mailing_address is not set (CASL requires a physical address)')
  }
  if (!settings?.sending_address?.trim()) {
    reasons.push('settings.sending_address is not set')
  }
  if (!contact?.email) reasons.push('No recipient selected')

  const ctx: MergeContext = {
    org,
    contact,
    settings: {
      signature_md: settings?.signature_md,
      casl_footer_md: settings?.casl_footer_md,
      mailing_address: settings?.mailing_address,
      sending_address: settings?.sending_address,
      booking_link: process.env.NEXT_PUBLIC_BOOKING_URL ?? 'https://kasandyconsulting.com/contact#book',
      phone: settings?.phone,
    },
    manualFills,
  }

  const bodyResult = renderTemplate(bodySource, ctx)
  const subjResult = renderTemplate(subjectSource, ctx)

  const missingAuto = Array.from(new Set([...bodyResult.unresolved, ...subjResult.unresolved]))
  const missingManual = Array.from(new Set([...bodyResult.unfilled, ...subjResult.unfilled]))

  if (missingAuto.length) reasons.push(`Unresolved fields: ${missingAuto.join(', ')}`)

  // A name typed into the greeting instead of a token. No token is unresolved, so
  // every other check here passes happily while the email opens by addressing
  // somebody who is not the recipient. This came within one click of going out.
  const greeted = greetingMismatch(bodySource, contact?.name)
  if (greeted) {
    reasons.push(
      contact?.name
        ? `The copy opens "Hi ${greeted}," but this is addressed to ${contact.name}. Use [First name] so it follows the recipient.`
        : `The copy opens "Hi ${greeted}," with a name typed in rather than [First name].`,
    )
  }
  if (missingManual.length) {
    reasons.push(`Awaiting your input: ${missingManual.join(', ')} — these are never auto-filled`)
  }

  // The signature carries the sign-off, so strip any the copy still has: printing
  // "Warmly, Jackee" twice is the tell of a templated email.
  const sig = signatureFrom(settings ?? {})
  const bodyNoSignOff = stripSignOff(bodyResult.rendered)
  const optOut = optOutUrl(org.id, contact?.id)

  const textBody = [bodyNoSignOff, '', SIGN_OFF, signatureText(sig)].join('\n')
  const full = settings
    ? withCaslFooter(textBody, { ...settings, signature_md: null }, optOut)
    : textBody

  const html = settings
    ? [
        bodyToHtml(bodyNoSignOff),
        `<p style="margin:22px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a">${SIGN_OFF}</p>`,
        signatureHtml(sig),
        `<div style="margin-top:26px;padding-top:14px;border-top:1px solid #e5e0dc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11.5px;line-height:1.6;color:#8a7f79">` +
          `${(settings.casl_footer_md ?? '').replace(/</g, '&lt;')}<br>` +
          `${(settings.mailing_address ?? '').replace(/</g, '&lt;')}<br>` +
          `<a href="${optOut}" style="color:#8a7f79">Unsubscribe</a>` +
          `</div>`,
      ].join('')
    : ''

  return {
    ready: reasons.length === 0,
    reasons,
    subject: subjResult.rendered,
    body: bodyResult.rendered,
    full,
    html,
  }
}

/**
 * Deliver one email through Resend. Callers must have passed checkSend first; the
 * database send-gate is still the final authority when the send row is written.
 */
export async function deliver(args: {
  to: string
  from: string
  subject: string
  text: string
  html?: string
  /**
   * One-click unsubscribe target. Omit for transactional mail — a proposal to sign
   * or a request to verify a phase is not something a recipient should be able to
   * "unsubscribe" from, and RFC 8058 lets a provider POST to this URL unprompted,
   * so pointing it at a document page invites an automated hit on that page.
   */
  optOutHref?: string
  replyTo?: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false as const, error: 'RESEND_API_KEY is not set' }

  const resend = new Resend(apiKey)
  const { data, error } = await resend.emails.send({
    from: args.from,
    to: args.to,
    subject: args.subject,
    text: args.text,
    ...(args.html ? { html: args.html } : {}),
    ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    ...(args.optOutHref
      ? {
          headers: {
            // RFC 8058: one-click unsubscribe honoured by the major mailbox providers.
            'List-Unsubscribe': `<${args.optOutHref}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }
      : {}),
  })

  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, id: data?.id ?? null }
}
