'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isOperator } from '@/lib/engine/operators'
import { deliver } from '@/lib/engine/send'
import { subscriberOptOutUrl } from '@/lib/engine/optout'
import { bodyToHtml } from '@/lib/engine/signature'
import {
  dedupe,
  suppress,
  campaignBlockers,
  personalise,
  type Recipient,
  type Segment,
} from '@/lib/engine/campaigns'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

/**
 * Who is actually in a segment, right now.
 *
 * Resolved against live tables every time rather than stored on the campaign. A
 * saved audience is a snapshot, and a snapshot keeps mailing the person who
 * unsubscribed yesterday — which is the exact failure CASL punishes.
 *
 * Every export from a 'use server' file is a callable endpoint, not just an internal
 * helper — so this needs the operator check as much as any button does. Without it,
 * a single unauthenticated POST would return the entire subscriber list and every
 * prospect contact address: the most valuable data in the platform, handed over by a
 * function that only looked like a private one.
 */
export async function segmentRecipients(segment: Segment): Promise<Recipient[]> {
  const { ok } = await operator()
  if (!ok) return []

  return recipientsFor(segment)
}

/** The query itself, with no session of its own — callers do the authorising. */
async function recipientsFor(segment: Segment): Promise<Recipient[]> {
  const db = createAdminClient()
  const out: Recipient[] = []

  if (segment === 'subscribers' || segment === 'everyone') {
    const { data } = await db
      .from('subscribers')
      .select('email, name')
      .is('unsubscribed_at', null)
    for (const s of data ?? []) out.push({ email: s.email, name: s.name })
  }

  if (segment === 'prospects' || segment === 'everyone') {
    // Only contacts whose organisation has a consent basis and has not opted out.
    // The join is done here rather than in SQL so the rule is legible.
    const { data: consented } = await db
      .from('consent_ledger')
      .select('org_id')
      .is('optout_at', null)
    const allowed = new Set((consented ?? []).map((c) => c.org_id))

    if (allowed.size) {
      const { data } = await db
        .from('contacts')
        .select('email, name, org_id, email_status')
        .not('email', 'is', null)
      for (const c of data ?? []) {
        if (allowed.has(c.org_id) && c.email_status === 'published') {
          out.push({ email: c.email as string, name: c.name })
        }
      }
    }
  }

  if (segment === 'clients' || segment === 'everyone') {
    const { data: clients } = await db.from('clients').select('org_id')
    const orgIds = (clients ?? []).map((c) => c.org_id)
    if (orgIds.length) {
      const { data } = await db
        .from('contacts')
        .select('email, name, org_id')
        .in('org_id', orgIds)
        .not('email', 'is', null)
      for (const c of data ?? []) out.push({ email: c.email as string, name: c.name })
    }
  }

  return dedupe(out)
}

/** Everyone who must never be mailed again, from every route that can suppress. */
async function suppressionList(): Promise<string[]> {
  const db = createAdminClient()
  const [{ data: unsubbed }, { data: optedOut }] = await Promise.all([
    db.from('subscribers').select('email').not('unsubscribed_at', 'is', null),
    db.from('consent_ledger').select('org_id').not('optout_at', 'is', null),
  ])

  const emails = (unsubbed ?? []).map((s) => s.email as string)

  // An org-level opt-out suppresses every contact at that org, not just the person
  // who clicked. They asked not to be contacted; the list they were on is not the point.
  const orgIds = (optedOut ?? []).map((c) => c.org_id)
  if (orgIds.length) {
    const { data } = await db.from('contacts').select('email').in('org_id', orgIds).not('email', 'is', null)
    for (const c of data ?? []) emails.push(c.email as string)
  }

  return emails
}

export async function saveCampaign(args: {
  id?: string
  subject: string
  bodyMd: string
  segment: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const row = {
    subject: args.subject.trim(),
    body_md: args.bodyMd,
    segment: args.segment,
    created_by: email,
  }

  if (args.id) {
    // The trigger refuses this outright for a sent campaign; its wording is written
    // to be read, so it is passed through rather than replaced.
    const { error } = await supabase.from('campaigns').update(row).eq('id', args.id)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/marketing')
    return { ok: true, id: args.id }
  }

  const { data, error } = await supabase.from('campaigns').insert(row).select('id').single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true, id: data.id as string }
}

/**
 * Send a campaign for real — and be able to finish what a timeout interrupted.
 *
 * A serverless invocation is capped in wall-clock time, and Resend accepts a couple
 * of messages a second, so a list of any size cannot go out in one call. Written as
 * a single loop this would have died partway through a real send, leaving a campaign
 * marked "sending" and no way to tell who had already received it — and the obvious
 * recovery, running it again, would have mailed the first half twice.
 *
 * So the recipient rows are the queue. Each pass takes only those still `queued`,
 * works until its time budget runs out, and returns whether anything is left. Every
 * message is accounted for whenever the work stops, and re-running resumes rather
 * than repeats.
 */
export async function sendCampaign(campaignId: string) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const db = createAdminClient()

  const [{ data: campaign }, { data: settings }] = await Promise.all([
    supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle(),
    supabase.from('settings').select('*').maybeSingle(),
  ])

  if (!campaign) return { ok: false, error: 'That campaign no longer exists.' }
  if (campaign.status === 'sent') {
    return { ok: false, error: 'That campaign has already gone out.' }
  }

  // A resumed run keeps the audience it started with. Re-resolving the segment
  // halfway through would mail anyone who subscribed since the first pass, and skip
  // anyone who left — the recipient rows already record who this campaign is for.
  const resuming = campaign.status === 'sending'

  if (!resuming) {
    const all = await recipientsFor(campaign.segment as Segment)
    const { send, held } = suppress(all, await suppressionList())

    const blockers = campaignBlockers(
      { subject: campaign.subject, bodyMd: campaign.body_md, segment: campaign.segment },
      {
        mailingAddress: settings?.mailing_address ?? null,
        sendingAddress: settings?.sending_address ?? null,
        recipientCount: send.length,
      },
    )
    if (blockers.length) return { ok: false, error: blockers.join(' ') }

    await db.from('campaigns').update({ status: 'sending', suppressed_count: held.length }).eq('id', campaignId)

    // Recorded before delivery, held back included. A suppressed row is evidence the
    // list was honoured, which is worth as much as evidence the mail went out.
    await db.from('campaign_recipients').insert([
      ...send.map((r) => ({ campaign_id: campaignId, email: r.email, name: r.name, status: 'queued' })),
      ...held.map((r) => ({
        campaign_id: campaignId,
        email: r.email,
        name: r.name,
        status: 'suppressed',
        reason: 'On the suppression list',
      })),
    ])
  }

  if (!settings?.mailing_address?.trim() || !settings?.sending_address?.trim()) {
    return { ok: false, error: 'The mailing or sending address went missing — check Admin → Settings.' }
  }

  const { data: queued } = await db
    .from('campaign_recipients')
    .select('email, name')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')

  const send: Recipient[] = (queued ?? []).map((q) => ({ email: q.email as string, name: q.name }))

  const footer = settings.casl_footer_md?.trim() || ''
  const address = settings.mailing_address.trim()
  const started = Date.now()
  // Stop at 45s so there is room to write the totals and return a response rather
  // than being killed mid-flight with the tallies unrecorded.
  const budgetMs = 45_000
  let sent = 0
  let failed = 0
  let remaining = 0

  for (const r of send) {
    if (Date.now() - started > budgetMs) {
      remaining = send.length - sent - failed
      break
    }
    const body = personalise(campaign.body_md, r)
    const unsubscribe = subscriberOptOutUrl(r.email)

    const text = `${body}\n\n—\n${footer ? `${footer}\n` : ''}${address}\nUnsubscribe: ${unsubscribe}`
    const html =
      bodyToHtml(body) +
      `<hr style="border:0;border-top:1px solid #e5e5e5;margin:26px 0 14px">` +
      `<div style="font:12px/1.6 system-ui,sans-serif;color:#777">` +
      (footer ? `<div style="margin-bottom:6px">${footer}</div>` : '') +
      `<div>${address}</div>` +
      `<div style="margin-top:6px"><a href="${unsubscribe}" style="color:#777">Unsubscribe</a></div>` +
      `</div>`

    const result = await deliver({
      to: r.email,
      from: settings.sending_address,
      subject: personalise(campaign.subject, r),
      text,
      html,
      optOutHref: unsubscribe,
    })

    if (result.ok) {
      sent++
      await db
        .from('campaign_recipients')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('campaign_id', campaignId)
        .eq('email', r.email)
    } else {
      failed++
      await db
        .from('campaign_recipients')
        .update({ status: 'failed', reason: result.error })
        .eq('campaign_id', campaignId)
        .eq('email', r.email)
    }
  }

  // Totals are counted from the rows, not from this pass, so a resumed campaign
  // reports what actually went out rather than what the last run managed.
  const { count: totalSent } = await db
    .from('campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')
  const { count: totalFailed } = await db
    .from('campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'failed')
  const { count: stillQueued } = await db
    .from('campaign_recipients')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')

  const done = (stillQueued ?? 0) === 0

  await db
    .from('campaigns')
    .update({
      // Stays 'sending' while anyone is still queued, which is what makes the
      // remaining work findable rather than lost.
      status: done ? ((totalFailed ?? 0) > 0 && (totalSent ?? 0) === 0 ? 'failed' : 'sent') : 'sending',
      ...(done ? { sent_at: new Date().toISOString() } : {}),
      sent_count: totalSent ?? 0,
      failed_count: totalFailed ?? 0,
    })
    .eq('id', campaignId)

  await db.from('audit_log').insert({
    actor: email,
    action: done ? 'campaign.sent' : 'campaign.sending',
    entity: 'campaigns',
    entity_id: campaignId,
    meta: {
      subject: campaign.subject,
      segment: campaign.segment,
      this_pass: { sent, failed },
      total_sent: totalSent ?? 0,
      still_queued: stillQueued ?? 0,
    },
  })

  revalidatePath('/marketing')
  return {
    ok: true,
    sent: totalSent ?? 0,
    failed: totalFailed ?? 0,
    suppressed: campaign.suppressed_count ?? 0,
    remaining: stillQueued ?? 0,
    done,
  }
}

// ─── Blog board ─────────────────────────────────────────────────────────────

export async function movePost(args: { id: string; stage: string }) {
  const { supabase, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  // The database keeps posts.status and the website in step with this; that rule is
  // not repeated here, so the two cannot drift apart.
  const { error } = await supabase.from('posts').update({ stage: args.stage }).eq('id', args.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/marketing')
  revalidatePath('/cms/content')
  return { ok: true }
}

// ─── LinkedIn planner ───────────────────────────────────────────────────────

export async function saveSocialPost(args: {
  id?: string
  body: string
  status: string
  scheduledFor: string
  url: string
  reactions: string
  comments: string
}) {
  const { supabase, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const num = (v: string) => (v.trim() === '' ? null : Number(v))
  if (args.reactions.trim() && !Number.isFinite(num(args.reactions))) {
    return { ok: false, error: 'Reactions has to be a number, or empty.' }
  }

  const row = {
    body: args.body,
    status: args.status,
    scheduled_for: args.scheduledFor ? new Date(args.scheduledFor).toISOString() : null,
    posted_at: args.status === 'posted' ? new Date().toISOString() : null,
    url: args.url.trim() || null,
    reactions: num(args.reactions),
    comments: num(args.comments),
  }

  const { error } = args.id
    ? await supabase.from('social_posts').update(row).eq('id', args.id)
    : await supabase.from('social_posts').insert(row)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}

export async function deleteSocialPost(id: string) {
  const { supabase, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  const { error } = await supabase.from('social_posts').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/marketing')
  return { ok: true }
}
