import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeEmail } from '@/lib/spam'

/**
 * Record a public form submission in the platform (E7, brief §11).
 *
 * This runs alongside the existing KV write rather than replacing it. The legacy
 * /admin still reads KV, and a marketing form is not the place to discover that a new
 * dependency is down — so Supabase becomes the record of truth while KV keeps working
 * until /admin is retired.
 *
 * Every call is wrapped: a failure here must never turn a working contact form into a
 * 500. The visitor's message reaching Jackee matters more than this row existing, and
 * the KV write has already happened by the time we get here.
 */
export type RecordArgs = {
  formSlug: string
  name?: string | null
  email?: string | null
  organisation?: string | null
  message?: string | null
  payload: Record<string, unknown>
  sourcePath?: string | null
  referrer?: string | null
  ip?: string | null
}

export async function recordSubmission(args: RecordArgs): Promise<{ ok: boolean; id?: string }> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('submissions')
      .insert({
        form_slug: args.formSlug,
        name: args.name?.trim() || null,
        email: args.email?.trim().toLowerCase() || null,
        organisation: args.organisation?.trim() || null,
        message: args.message?.trim() || null,
        payload: args.payload,
        source_path: args.sourcePath ?? null,
        referrer: args.referrer ?? null,
        ip: args.ip ?? null,
      })
      .select('id')
      .single()

    if (error) return { ok: false }
    return { ok: true, id: data.id }
  } catch {
    return { ok: false }
  }
}

/**
 * Add a newsletter subscriber with its lawful basis.
 *
 * Someone who has previously opted out is left alone: the database refuses to clear an
 * unsubscribe, and this reports success rather than surfacing an error to the visitor,
 * because from their side the form did what they asked. Silently re-adding them would
 * be the actual failure.
 */
export async function recordSubscriber(args: {
  email: string
  name?: string | null
  basis?: string
  source?: string | null
}): Promise<{ ok: boolean; alreadyOptedOut?: boolean }> {
  try {
    const supabase = createAdminClient()
    const email = args.email.trim().toLowerCase()

    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, unsubscribed_at')
      .ilike('email', email)
      .maybeSingle()

    if (existing) {
      if (existing.unsubscribed_at) return { ok: true, alreadyOptedOut: true }
      return { ok: true }
    }

    const { error } = await supabase.from('subscribers').insert({
      email,
      name: args.name?.trim() || null,
      consent_basis: args.basis ?? 'express_signup',
      consent_source: args.source ?? null,
    })

    return { ok: !error }
  } catch {
    return { ok: false }
  }
}

/**
 * Attach a submission to a prospect, creating the org if this is a new name.
 *
 * The brief asks that a contact form create a prospect intake. It does not ask us to
 * invent a leader, a segment or a fit assessment — so a self-submitted org is created
 * with its name and website only, at stage 0_unverified, and the provenance
 * constraint keeps it that way until someone verifies something. `sender` records
 * that this came from the website rather than from research.
 */
export async function linkSubmissionToProspect(args: {
  submissionId: string
  organisation: string | null
  email: string | null
  name: string | null
}): Promise<{ ok: boolean; orgId?: string }> {
  try {
    if (!args.organisation?.trim()) return { ok: false }
    const supabase = createAdminClient()
    const orgName = args.organisation.trim()

    const { data: existing } = await supabase
      .from('orgs')
      .select('id')
      .ilike('name', orgName)
      .maybeSingle()

    let orgId = existing?.id as string | undefined
    // Whether this submission is what brought the organisation into existence.
    // It decides whether the enquiry may record a consent basis — see below.
    const orgIsNew = !orgId

    if (!orgId) {
      const { data: created, error } = await supabase
        .from('orgs')
        .insert({
          name: orgName,
          stage: '0_unverified',
          notes: 'Created from a website enquiry — nothing here is verified.',
        })
        .select('id')
        .single()

      if (error) return { ok: false }
      orgId = created.id
    }

    // Record the person, with the website as the source. Inbound contact is a
    // published, role-relevant route by definition: they wrote to us.
    if (args.email) {
      const address = args.email.trim().toLowerCase()
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('org_id', orgId)
        .ilike('email', address)
        .maybeSingle()

      let contactId = contact?.id as string | undefined

      if (!contactId) {
        const { data: madeContact } = await supabase
          .from('contacts')
          .insert({
            org_id: orgId,
            name: args.name?.trim() || null,
            email: address,
            // "They typed it into our form" is not the same as confirmed. The email
            // has not been round-tripped, so it is claimed, not verified.
            email_status: 'inferred',
            source: 'website enquiry (self-submitted, unverified)',
            verified_on: new Date().toISOString().slice(0, 10),
          })
          .select('id')
          .single()
        contactId = madeContact?.id
      }

      // CASL. An inbound enquiry is an express basis for replying to the person who
      // sent it — but the send-gate reads consent at the ORGANISATION level, so
      // writing a row here for an org that already exists in the pipeline would let
      // anyone who can pass the form's spam checks unlock outreach to every contact
      // at a researched prospect by naming it in a submission. That is consent
      // forgery, and it is exactly what the ledger exists to prevent.
      //
      // So a basis is recorded only when this submission is what created the
      // organisation — a brand-new org has no other contacts, so the scope is the
      // one address that was typed in. For an existing prospect the enquiry is
      // recorded and shown in the CMS, and an operator decides.
      if (orgIsNew && contactId) {
        await supabase.from('consent_ledger').insert({
          org_id: orgId,
          contact_id: contactId,
          basis: 'express_inbound_unverified',
          source_url: 'kasandyconsulting.com contact form',
        })
      }
    }

    await supabase.from('submissions').update({ org_id: orgId }).eq('id', args.submissionId)
    return { ok: true, orgId }
  } catch {
    return { ok: false }
  }
}
