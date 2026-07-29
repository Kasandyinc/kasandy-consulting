'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { deliver } from '@/lib/engine/send'
import { signatureFrom, signatureHtml, bodyToHtml, SIGN_OFF } from '@/lib/engine/signature'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

/**
 * Stand up an engagement with its phases.
 *
 * Phases carry the money, because the phase is what the client verifies and
 * verification is what releases the invoice. Splitting the total across phases here
 * means the billing schedule and the delivery plan are the same object.
 */
export async function createEngagement(args: {
  clientId: string
  name: string
  phases: { name: string; amountCents: number; targetOn: string | null }[]
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  if (!args.name.trim()) return { ok: false, error: 'The engagement needs a name.' }

  const phases = args.phases.filter((p) => p.name.trim())
  if (phases.length === 0) return { ok: false, error: 'An engagement needs at least one phase.' }

  const { data: engagement, error } = await supabase
    .from('engagements')
    .insert({ client_id: args.clientId, name: args.name.trim(), phase: phases[0].name.trim() })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  const { error: phaseError } = await supabase.from('engagement_phases').insert(
    phases.map((p, i) => ({
      engagement_id: engagement!.id,
      position: i + 1,
      name: p.name.trim(),
      amount_cents: Math.max(0, Math.round(p.amountCents)),
      target_on: p.targetOn || null,
      status: i === 0 ? 'active' : 'planned',
    })),
  )

  if (phaseError) return { ok: false, error: phaseError.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'engagement.created',
    entity: 'engagements',
    entity_id: engagement!.id,
    meta: { client_id: args.clientId, phases: phases.length },
  })

  revalidatePath(`/clients/${args.clientId}`)
  revalidatePath('/clients')
  return { ok: true }
}

export async function savePhase(args: {
  clientId: string
  phaseId: string
  name: string
  briefMd: string
  status: string
  targetOn: string | null
  amountCents: number
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('engagement_phases')
    .update({
      name: args.name.trim() || 'Phase',
      brief_md: args.briefMd,
      status: args.status,
      target_on: args.targetOn || null,
      amount_cents: Math.max(0, Math.round(args.amountCents)),
    })
    .eq('id', args.phaseId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'phase.saved',
    entity: 'engagement_phases',
    entity_id: args.phaseId,
    meta: { status: args.status },
  })

  revalidatePath(`/clients/${args.clientId}`)
  return { ok: true }
}

export async function saveDeliverable(args: {
  clientId: string
  phaseId: string
  deliverableId?: string
  name: string
  detail: string
  status: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  if (!args.name.trim()) return { ok: false, error: 'A deliverable needs a name.' }

  const payload = {
    phase_id: args.phaseId,
    name: args.name.trim(),
    detail: args.detail.trim() || null,
    status: args.status,
  }

  const { error } = args.deliverableId
    ? await supabase.from('deliverables').update(payload).eq('id', args.deliverableId)
    : await supabase.from('deliverables').insert(payload)

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/clients/${args.clientId}`)
  return { ok: true }
}

export async function deleteDeliverable(args: { clientId: string; deliverableId: string }) {
  const { supabase, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase.from('deliverables').delete().eq('id', args.deliverableId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/clients/${args.clientId}`)
  return { ok: true }
}

/**
 * Ask the client to verify a phase.
 *
 * This is the one thing an operator cannot do themselves — the database refuses a
 * verification written by anyone who is not a client user — so the action here is to
 * move the phase into review and tell them it is waiting.
 */
export async function requestVerification(args: { clientId: string; phaseId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { data: phase } = await supabase
    .from('engagement_phases')
    .select('id, name, verified_at, engagement_id')
    .eq('id', args.phaseId)
    .maybeSingle()

  if (!phase) return { ok: false, error: 'Phase not found.' }
  if (phase.verified_at) return { ok: false, error: 'Already verified.' }

  const [{ data: users }, { data: settings }] = await Promise.all([
    supabase.from('client_users').select('email, name').eq('client_id', args.clientId).eq('active', true),
    supabase.from('settings').select('*').maybeSingle(),
  ])

  if (!users?.length) {
    return { ok: false, error: 'No portal users for this client yet — invite someone first.' }
  }

  await supabase.from('engagement_phases').update({ status: 'in_review' }).eq('id', args.phaseId)

  const site = process.env.NEXT_PUBLIC_HUB_URL ?? 'https://hub.kasandyconsulting.com'
  const sig = signatureFrom(settings ?? {})
  const failures: string[] = []

  for (const u of users) {
    const text =
      `Hi ${u.name?.split(' ')[0] ?? 'there'},\n\n` +
      `"${phase.name}" is ready for you to look at.\n\n` +
      `When you are happy it is working, mark it Verified live in your portal:\n\n${site}/portal\n\n` +
      `That is what closes the phase — nothing is billed for it until you do.`

    const sent = await deliver({
      to: u.email,
      from: (settings as { sending_address: string }).sending_address,
      subject: `Ready for your review — ${phase.name}`,
      text: `${text}\n\n${SIGN_OFF}\n${sig.name}`,
      html: [
        bodyToHtml(text),
        `<p style="margin:22px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a">${SIGN_OFF}</p>`,
        signatureHtml(sig),
      ].join(''),
      replyTo: sig.email,
    })

    if (!sent.ok) failures.push(`${u.email}: ${sent.error}`)
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'phase.verification_requested',
    entity: 'engagement_phases',
    entity_id: args.phaseId,
    meta: { notified: users.length - failures.length, failures },
  })

  revalidatePath(`/clients/${args.clientId}`)

  if (failures.length === users.length) {
    return { ok: false, error: `The phase is in review, but no email reached anyone — ${failures[0]}` }
  }
  if (failures.length) {
    return { ok: true, warning: `Some notifications failed: ${failures.join('; ')}` }
  }
  return { ok: true }
}

/** Give someone at the client access to the portal. */
export async function inviteClientUser(args: {
  clientId: string
  email: string
  name: string
  title: string
}) {
  const { supabase, email: actor, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const address = args.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(address)) return { ok: false, error: 'That email does not look right.' }

  // A portal user who is also an operator would blur the one boundary the
  // verification rule rests on.
  if (isOperator(address)) {
    return { ok: false, error: 'That address is an operator — it cannot also be a client user.' }
  }

  const { error } = await supabase.from('client_users').insert({
    client_id: args.clientId,
    email: address,
    name: args.name.trim() || null,
    title: args.title.trim() || null,
    invited_at: new Date().toISOString(),
  })

  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? 'That person already has access.' : error.message,
    }
  }

  await supabase.from('audit_log').insert({
    actor,
    action: 'client_user.invited',
    entity: 'clients',
    entity_id: args.clientId,
    meta: { email: address },
  })

  revalidatePath(`/clients/${args.clientId}`)
  return { ok: true }
}

export async function setClientUserActive(args: {
  clientId: string
  userId: string
  active: boolean
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('client_users')
    .update({ active: args.active })
    .eq('id', args.userId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: args.active ? 'client_user.enabled' : 'client_user.disabled',
    entity: 'client_users',
    entity_id: args.userId,
    meta: {},
  })

  revalidatePath(`/clients/${args.clientId}`)
  return { ok: true }
}
