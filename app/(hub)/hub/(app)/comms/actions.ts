'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { deliver } from '@/lib/engine/send'
import { bodyToHtml } from '@/lib/engine/signature'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

/**
 * Record a reply that arrived in your own mailbox.
 *
 * Until inbound routing is configured this is how a reply reaches the platform, and
 * it matters more than it looks: the insert sets orgs.replied_at through a database
 * trigger, which halts the sequence and makes the send-gate refuse further outreach.
 * Logging the reply is therefore not bookkeeping — it is what stops the follow-up
 * that would otherwise go to someone who has already answered.
 */
export async function logReply(args: {
  orgId: string
  contactId?: string | null
  fromEmail: string
  subject: string
  body: string
  occurredAt?: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  if (!args.body.trim()) return { ok: false, error: 'There is nothing to record.' }

  const { error } = await supabase.from('messages').insert({
    org_id: args.orgId,
    contact_id: args.contactId || null,
    direction: 'inbound',
    from_email: args.fromEmail.trim() || null,
    subject: args.subject.trim() || null,
    body: args.body,
    logged_by: email,
    occurred_at: args.occurredAt ? new Date(args.occurredAt).toISOString() : new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'reply.logged',
    entity: 'orgs',
    entity_id: args.orgId,
    meta: { from: args.fromEmail },
  })

  revalidatePath('/comms')
  revalidatePath(`/outreach/${args.orgId}`)
  return { ok: true }
}

/**
 * Send a one-off email from the hub.
 *
 * Deliberately not routed through the outreach send-gate. That gate governs
 * *sequence* mail to a prospect — consent basis, reply-stop, one-click-only — and it
 * is right that it refuses to keep marketing at someone who replied. This is the
 * reply to that person: a human answering a human, which is exactly what the gate
 * exists to make room for.
 *
 * What it does keep: the send is recorded, so the thread stays complete.
 */
export async function sendReply(args: {
  orgId: string
  contactId?: string | null
  to: string
  subject: string
  body: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const to = args.to.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { ok: false, error: 'That does not look like an email address.' }
  }
  if (!args.subject.trim()) return { ok: false, error: 'Give it a subject line.' }
  if (!args.body.trim()) return { ok: false, error: 'The message is empty.' }

  const { data: settings } = await supabase.from('settings').select('*').maybeSingle()
  if (!settings?.sending_address?.trim()) {
    return { ok: false, error: 'No sending address is set — add one in Admin → Settings.' }
  }

  // A reply to someone who wrote to you is correspondence, not a commercial
  // electronic message, so no unsubscribe footer is attached. Adding one to a direct
  // human reply would be both wrong and strange to receive.
  const result = await deliver({
    to,
    from: settings.sending_address,
    subject: args.subject.trim(),
    text: args.body,
    html: bodyToHtml(args.body),
    replyTo: settings.signature_email?.trim() || undefined,
  })

  if (!result.ok) return { ok: false, error: result.error }

  const { error } = await supabase.from('messages').insert({
    org_id: args.orgId,
    contact_id: args.contactId || null,
    direction: 'outbound',
    from_email: settings.sending_address,
    to_email: to,
    subject: args.subject.trim(),
    body: args.body,
    logged_by: email,
  })

  if (error) {
    // The mail has gone. Say so rather than reporting a failure that did not happen.
    return {
      ok: true,
      warning: `Sent, but the thread entry failed to save: ${error.message}`,
    }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'message.sent',
    entity: 'orgs',
    entity_id: args.orgId,
    meta: { to, subject: args.subject.trim() },
  })

  revalidatePath('/comms')
  revalidatePath(`/outreach/${args.orgId}`)
  return { ok: true }
}

/** Attach an inbound message that arrived from an address nobody recognised. */
export async function assignMessage(args: { messageId: string; orgId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  // Re-inserting is not an option — the reply-stop fires on insert, and an update
  // would not run it. Set replied_at explicitly so attaching a stray reply to an
  // organisation still halts that organisation's sequence.
  const { error } = await supabase
    .from('messages')
    .update({ org_id: args.orgId })
    .eq('id', args.messageId)

  if (error) return { ok: false, error: error.message }

  const { data: msg } = await supabase
    .from('messages')
    .select('direction, occurred_at')
    .eq('id', args.messageId)
    .maybeSingle()

  if (msg?.direction === 'inbound') {
    const { data: org } = await supabase.from('orgs').select('replied_at').eq('id', args.orgId).maybeSingle()
    if (!org?.replied_at) {
      await supabase.from('orgs').update({ replied_at: msg.occurred_at }).eq('id', args.orgId)
    }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'message.assigned',
    entity: 'messages',
    entity_id: args.messageId,
    meta: { org_id: args.orgId },
  })

  revalidatePath('/comms')
  return { ok: true }
}
