'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/spam'
import { documentHash } from '@/lib/engine/delivery'

/**
 * Accept a proposal.
 *
 * The signature is recorded against a hash of exactly the text that was on screen —
 * blueprint, terms and total — so "this is what I agreed to" is checkable rather than
 * a matter of trust. The database refuses a second signature and refuses to sign
 * anything that is not in `sent`, and inserting the row is what creates the client.
 */
export async function signProposal(args: {
  token: string
  name: string
  email: string
  title: string
  agreed: boolean
}) {
  if (!/^[0-9a-f]{32,64}$/i.test(args.token)) return { ok: false, error: 'Invalid link.' }
  if (!args.agreed) return { ok: false, error: 'Please confirm you have read the terms.' }

  const name = args.name.trim()
  const email = args.email.trim().toLowerCase()
  if (name.length < 2) return { ok: false, error: 'Please type your full name.' }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'That email does not look right.' }

  const h = headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || null

  // Signing is unauthenticated and irreversible. The database already refuses a second
  // signature, so the limit is not what protects the record — it stops someone with a
  // forwarded link from hammering the endpoint that creates a client and moves an
  // organisation to won.
  if (!(await rateLimit(`sign:${ip ?? 'unknown'}`, 20, 3600))) {
    return { ok: false, error: 'Too many attempts. Please wait a few minutes, or reply to our email.' }
  }

  const supabase = createAdminClient()
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, number, status, blueprint_md, terms_md, total_cents, org_id')
    .eq('token', args.token)
    .maybeSingle()

  if (!proposal) return { ok: false, error: 'This link is not valid.' }
  if (proposal.status !== 'sent') {
    return { ok: false, error: `This proposal is ${proposal.status} — there is nothing to sign.` }
  }

  const hash = await documentHash(proposal.blueprint_md, proposal.terms_md, proposal.total_cents)

  const { error } = await supabase.from('proposal_signatures').insert({
    proposal_id: proposal.id,
    signer_name: name,
    signer_email: email,
    signer_title: args.title.trim() || null,
    ip,
    user_agent: h.get('user-agent'),
    document_hash: hash,
  })

  // The trigger raises here for an already-signed or non-sent proposal; its message
  // is written to be read by a person, so pass it through rather than replacing it.
  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: `${name} <${email}>`,
    action: 'proposal.signed',
    entity: 'proposals',
    entity_id: proposal.id,
    meta: { number: proposal.number, org_id: proposal.org_id, document_hash: hash },
  })

  revalidatePath(`/proposal/${args.token}`)
  revalidatePath(`/outreach/${proposal.org_id}/proposal`)
  revalidatePath('/clients')
  return { ok: true }
}
