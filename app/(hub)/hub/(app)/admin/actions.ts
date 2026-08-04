'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

/**
 * Save platform settings.
 *
 * Until now every one of these went through the Supabase SQL editor by hand — the
 * mailing address the CASL send-gate depends on, the sending address, the signature,
 * the phone number. For a platform sold as one its owner runs, that was the wrong
 * way round.
 *
 * Two fields are validated rather than trusted, because the send-gate reads them and
 * a blank one means every send refuses with a message about a missing address:
 * mailing_address and sending_address.
 */
export async function saveSettings(args: {
  mailingAddress: string
  sendingAddress: string
  phone: string
  timezone: string
  caslFooterMd: string
  signatureName: string
  signatureRole: string
  signatureEmail: string
  signatureTagline: string
  signatureLogoUrl: string
  bookingUrl: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const mailing = args.mailingAddress.trim()
  const sending = args.sendingAddress.trim()

  // CASL requires a physical address in every commercial email. Saving a blank one
  // would not fail here — it would fail later, at the send, looking like a bug.
  if (!mailing) {
    return { ok: false, error: 'A mailing address is required — CASL puts it in every email footer.' }
  }
  if (!sending) {
    return { ok: false, error: 'A sending address is required, or nothing can be sent.' }
  }
  if (!/^[^<]*<[^@\s]+@[^@\s]+\.[^@\s]+>$|^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sending)) {
    return {
      ok: false,
      error: 'The sending address must be an email, optionally as "Name <address>".',
    }
  }
  if (args.signatureEmail.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(args.signatureEmail.trim())) {
    return { ok: false, error: 'That signature email does not look right.' }
  }

  // The domain must be one Resend has verified, or every send fails at the provider
  // with an error that reads like a code problem rather than a configuration one.
  const domain = process.env.RESEND_SENDING_DOMAIN?.trim() || 'kasandyconsulting.com'
  if (!sending.toLowerCase().includes(`@${domain.toLowerCase()}`)) {
    return {
      ok: false,
      error: `The sending address has to be on ${domain} — that is the domain verified in Resend.`,
    }
  }

  const { error } = await supabase
    .from('settings')
    .update({
      mailing_address: mailing,
      sending_address: sending,
      phone: args.phone.trim() || null,
      timezone: args.timezone.trim() || 'America/Vancouver',
      casl_footer_md: args.caslFooterMd.trim() || null,
      signature_name: args.signatureName.trim() || null,
      signature_role: args.signatureRole.trim() || null,
      signature_email: args.signatureEmail.trim() || null,
      signature_tagline: args.signatureTagline.trim() || null,
      signature_logo_url: args.signatureLogoUrl.trim() || null,
      booking_url: args.bookingUrl.trim() || null,
    })
    .eq('id', true)

  if (error) return { ok: false, error: error.message }

  // A database trigger records the diff; this is not repeated here.
  void email
  revalidatePath('/admin')
  revalidatePath('/')
  return { ok: true }
}

/**
 * Add or remove an operator.
 *
 * `engine_operators` is what RLS trusts, and it is deliberately separate from the
 * ENGINE_OPERATOR_EMAILS environment variable the application checks — both have to
 * agree for someone to actually get in. Removing the last operator would lock
 * everyone out of a platform whose only other role is `client`, so that is refused.
 */
export async function setOperator(args: { email: string; add: boolean }) {
  const { supabase, email: actor, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const address = args.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) {
    return { ok: false, error: 'That does not look like an email address.' }
  }

  if (args.add) {
    const { error } = await supabase.from('engine_operators').insert({ email: address })
    if (error) {
      return { ok: false, error: error.code === '23505' ? 'Already an operator.' : error.message }
    }
  } else {
    const { count } = await supabase
      .from('engine_operators')
      .select('email', { count: 'exact', head: true })

    if ((count ?? 0) <= 1) {
      return { ok: false, error: 'That is the last operator — removing it would lock everyone out.' }
    }
    if (address === actor?.toLowerCase()) {
      return { ok: false, error: 'You cannot remove your own access from here.' }
    }

    const { error } = await supabase.from('engine_operators').delete().eq('email', address)
    if (error) return { ok: false, error: error.message }
  }

  await supabase.from('audit_log').insert({
    actor,
    action: args.add ? 'operator.added' : 'operator.removed',
    entity: 'engine_operators',
    entity_id: null,
    meta: { email: address },
  })

  revalidatePath('/admin')
  return {
    ok: true,
    warning: args.add
      ? `${address} also has to be in ENGINE_OPERATOR_EMAILS in Vercel — the app checks that as well as this table.`
      : undefined,
  }
}
