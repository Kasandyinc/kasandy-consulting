'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { deliver } from '@/lib/engine/send'
import { signatureFrom, signatureHtml, bodyToHtml, SIGN_OFF } from '@/lib/engine/signature'
import {
  proposalTotalCents,
  defaultDepositCents,
  proposalBlockers,
  type ProposalModule,
} from '@/lib/engine/delivery'
import { formatMoney } from '@/lib/engine/money'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

const DEFAULT_TERMS = `**Payment.** A deposit is due on signature; the balance is invoiced against milestones as each phase is verified live by you.

**Acceptance.** A phase closes when you mark it Verified live in the client portal. That is what releases its invoice — not our say-so.

**Ownership.** You own the platform, the data, and the accounts. Kasandy Consulting holds no lock-in; everything is transferable at any point.

**Data.** Your data is stored in Canada. We do not sell, share, or train on it.

**Cancellation.** Either side may stop with 30 days' written notice. Work completed to that point is payable; work not started is not.`

/** Open a draft proposal for an org, numbered in sequence. */
export async function createProposal(orgId: string) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const [{ data: org }, { data: discovery }, { count }] = await Promise.all([
    supabase.from('orgs').select('name').eq('id', orgId).maybeSingle(),
    supabase.from('discoveries').select('id').eq('org_id', orgId).maybeSingle(),
    supabase.from('proposals').select('id', { count: 'exact', head: true }),
  ])

  const number = `P-${String((count ?? 0) + 1).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      org_id: orgId,
      discovery_id: discovery?.id ?? null,
      number,
      title: `Operations platform — ${org?.name ?? 'proposal'}`,
      terms_md: DEFAULT_TERMS,
    })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'proposal.created',
    entity: 'proposals',
    entity_id: data!.id,
    meta: { org_id: orgId, number },
  })

  revalidatePath(`/outreach/${orgId}/proposal`)
  return { ok: true }
}

/** Add or remove a catalogue module. Refused once the proposal has been sent. */
export async function setProposalModules(args: {
  orgId: string
  proposalId: string
  moduleIds: string[]
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { data: modules } = await supabase
    .from('service_modules')
    .select('*')
    .in('id', args.moduleIds.length ? args.moduleIds : ['00000000-0000-0000-0000-000000000000'])

  // Replace wholesale: the checklist is the source of truth for what is on the
  // proposal, so a removed tick has to actually remove the line.
  const { error: delError } = await supabase
    .from('proposal_modules')
    .delete()
    .eq('proposal_id', args.proposalId)

  // The database refuses this on a sent proposal — surface its message as-is.
  if (delError) return { ok: false, error: delError.message }

  const rows = (modules ?? []).map((m, i) => ({
    proposal_id: args.proposalId,
    module_id: m.id,
    name: m.name,
    summary: m.summary,
    price_cents: m.price_cents,
    quantity: 1,
    position: i,
  }))

  if (rows.length) {
    const { error } = await supabase.from('proposal_modules').insert(rows)
    if (error) return { ok: false, error: error.message }
  }

  const total = proposalTotalCents(rows)
  const { error: totalError } = await supabase
    .from('proposals')
    .update({ total_cents: total, deposit_cents: defaultDepositCents(total) })
    .eq('id', args.proposalId)

  if (totalError) return { ok: false, error: totalError.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'proposal.modules_changed',
    entity: 'proposals',
    entity_id: args.proposalId,
    meta: { modules: rows.length, total_cents: total },
  })

  revalidatePath(`/outreach/${args.orgId}/proposal`)
  return { ok: true }
}

export async function saveProposal(args: {
  orgId: string
  proposalId: string
  title: string
  blueprintMd: string
  termsMd: string
  depositCents: number
  validUntil: string | null
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('proposals')
    .update({
      title: args.title.trim() || 'Proposal',
      blueprint_md: args.blueprintMd,
      terms_md: args.termsMd,
      deposit_cents: Math.max(0, Math.round(args.depositCents)),
      valid_until: args.validUntil || null,
    })
    .eq('id', args.proposalId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'proposal.saved',
    entity: 'proposals',
    entity_id: args.proposalId,
    meta: {},
  })

  revalidatePath(`/outreach/${args.orgId}/proposal`)
  return { ok: true }
}

/**
 * Compose the Blueprint from the discovery findings and the chosen modules.
 *
 * Like the assessment, this composes rather than invents: the problem statement comes
 * from findings an operator recorded, and the scope comes from the catalogue entries
 * they ticked. Nothing here asserts a fact the platform does not already hold.
 */
export async function generateBlueprint(args: { orgId: string; proposalId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const [{ data: proposal }, { data: org }, { data: modules }] = await Promise.all([
    supabase.from('proposals').select('*').eq('id', args.proposalId).maybeSingle(),
    supabase.from('orgs').select('name').eq('id', args.orgId).maybeSingle(),
    supabase.from('proposal_modules').select('*').eq('proposal_id', args.proposalId).order('position'),
  ])

  if (!proposal) return { ok: false, error: 'Proposal not found.' }
  if (proposal.status !== 'draft') {
    return { ok: false, error: 'This proposal has been sent — withdraw it to a draft first.' }
  }

  const mods = (modules ?? []) as ProposalModule[]
  if (!mods.length) return { ok: false, error: 'Pick the modules first — the Blueprint describes them.' }

  const { data: discovery } = proposal.discovery_id
    ? await supabase.from('discoveries').select('id, summary').eq('id', proposal.discovery_id).maybeSingle()
    : { data: null }

  const { data: findings } = discovery
    ? await supabase
        .from('discovery_findings')
        .select('severity, area, finding, recommendation')
        .eq('discovery_id', discovery.id)
        .in('severity', ['critical', 'material'])
    : { data: [] }

  const problems = (findings ?? []) as { area: string | null; finding: string; recommendation: string | null }[]
  const total = proposalTotalCents(mods)

  const body =
    `# ${proposal.title}\n\n` +
    `## Where you are\n\n` +
    (discovery?.summary ? `${discovery.summary}\n\n` : '') +
    (problems.length
      ? problems.map((p) => `- **${p.area ?? 'General'}** — ${p.finding}`).join('\n') + '\n'
      : '_Discovery findings will appear here once recorded._\n') +
    `\n## What we will build\n\n` +
    mods
      .map(
        (m) =>
          `### ${m.name}\n\n${m.summary ?? ''}\n\n**${formatMoney(m.price_cents)}**${m.quantity > 1 ? ` × ${m.quantity}` : ''}`,
      )
      .join('\n\n') +
    `\n\n## What it costs\n\n` +
    mods
      .map((m) => `| ${m.name} | ${formatMoney(m.price_cents * m.quantity)} |`)
      .join('\n') +
    `\n\n**Total: ${formatMoney(total)}**\n\n` +
    `Deposit on signature: ${formatMoney(proposal.deposit_cents)}. The balance is invoiced against ` +
    `milestones, each released when you mark the phase Verified live.\n\n` +
    `## How you will know it worked\n\n` +
    (problems.length
      ? problems
          .filter((p) => p.recommendation)
          .map((p) => `- ${p.recommendation}`)
          .join('\n')
      : '_To be agreed._') +
    `\n`

  const { error } = await supabase
    .from('proposals')
    .update({ blueprint_md: body })
    .eq('id', args.proposalId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'proposal.blueprint_generated',
    entity: 'proposals',
    entity_id: args.proposalId,
    meta: { modules: mods.length, findings_used: problems.length },
  })

  revalidatePath(`/outreach/${args.orgId}/proposal`)
  return { ok: true }
}

/**
 * Send the proposal for signature.
 *
 * Sending freezes the document at the database layer, so what the client opens cannot
 * change under them afterwards. The email carries a link, not the terms — the signed
 * copy has to be the one the platform holds.
 */
export async function sendProposal(args: { orgId: string; proposalId: string; contactId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const [{ data: proposal }, { data: modules }, { data: contact }, { data: settings }, { data: org }] =
    await Promise.all([
      supabase.from('proposals').select('*').eq('id', args.proposalId).maybeSingle(),
      supabase.from('proposal_modules').select('id').eq('proposal_id', args.proposalId),
      supabase.from('contacts').select('*').eq('id', args.contactId).maybeSingle(),
      supabase.from('settings').select('*').maybeSingle(),
      supabase.from('orgs').select('name').eq('id', args.orgId).maybeSingle(),
    ])

  if (!proposal) return { ok: false, error: 'Proposal not found.' }

  const blockers = proposalBlockers(proposal, modules ?? [], contact?.email ?? null)
  if (blockers.length) {
    await supabase.from('audit_log').insert({
      actor: email,
      action: 'proposal.send_refused',
      entity: 'proposals',
      entity_id: args.proposalId,
      meta: { reasons: blockers },
    })
    return { ok: false, error: `Refused — ${blockers.join('; ')}` }
  }

  // Freeze first. If marking it sent fails, nothing has left; if delivery fails after,
  // the document is still the one the link points at.
  const { error: freezeError } = await supabase
    .from('proposals')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', args.proposalId)

  if (freezeError) return { ok: false, error: freezeError.message }

  const site = process.env.NEXT_PUBLIC_HUB_URL ?? 'https://hub.kasandyconsulting.com'
  const link = `${site}/proposal/${proposal.token}`
  const sig = signatureFrom(settings ?? {})

  const text =
    `Hi ${contact!.name?.split(' ')[0] ?? 'there'},\n\n` +
    `Here is the proposal for ${org?.name ?? 'your organisation'}, ready for your review.\n\n` +
    `${link}\n\n` +
    `It sets out what we found, what we would build, and what it costs. ` +
    `You can sign it there, or reply with questions first — either is fine.`

  const sent = await deliver({
    to: contact!.email!,
    from: (settings as { sending_address: string }).sending_address,
    subject: `Proposal — ${proposal.title}`,
    text: `${text}\n\n${SIGN_OFF}\n${sig.name}\n${sig.role}`,
    html: [
      bodyToHtml(text),
      `<p style="margin:22px 0 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a">${SIGN_OFF}</p>`,
      signatureHtml(sig),
    ].join(''),
    replyTo: sig.email,
  })

  if (!sent.ok) {
    // Put it back to draft: a proposal marked sent that nobody received is worse than
    // one that is plainly still a draft.
    await supabase
      .from('proposals')
      .update({ status: 'draft', sent_at: null })
      .eq('id', args.proposalId)
    return { ok: false, error: `Delivery failed — ${sent.error}` }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'proposal.sent',
    entity: 'proposals',
    entity_id: args.proposalId,
    meta: { to: contact!.email, number: proposal.number },
  })

  revalidatePath(`/outreach/${args.orgId}/proposal`)
  return { ok: true }
}

/** Pull a sent proposal back to draft so it can be revised. */
export async function withdrawProposal(args: { orgId: string; proposalId: string }) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { data: signature } = await supabase
    .from('proposal_signatures')
    .select('id')
    .eq('proposal_id', args.proposalId)
    .maybeSingle()

  if (signature) {
    return { ok: false, error: 'This proposal has been signed — it cannot be withdrawn.' }
  }

  const { error } = await supabase
    .from('proposals')
    .update({ status: 'draft', sent_at: null })
    .eq('id', args.proposalId)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'proposal.withdrawn',
    entity: 'proposals',
    entity_id: args.proposalId,
    meta: {},
  })

  revalidatePath(`/outreach/${args.orgId}/proposal`)
  return { ok: true }
}
