import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { researchOrganisation } from '@/lib/engine/research'

/**
 * Research a prospect, on an operator's say-so.
 *
 * A route rather than a server action because a run that searches the web and then
 * reasons over it takes longer than a page's default budget, and `maxDuration` is
 * per route segment. A run cut off half way would leave a row saying "running"
 * forever, which reads as a hang rather than a timeout.
 */
export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // This endpoint spends money on a metered API and writes to the pipeline. It is
  // operator-only, checked here and again by RLS on both tables.
  if (!isOperator(user?.email)) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const { orgId } = (await req.json()) as { orgId?: string }
  if (!orgId) return NextResponse.json({ error: 'No organisation given.' }, { status: 400 })

  const { data: org } = await supabase
    .from('orgs')
    .select('id, name, website, city, province, segment')
    .eq('id', orgId)
    .maybeSingle()

  if (!org) return NextResponse.json({ error: 'Organisation not found.' }, { status: 404 })

  // Known addresses are the strongest signal for "is this even the right
  // organisation" — a domain match beats a name match every time.
  const [{ data: contacts }, { data: booking }] = await Promise.all([
    supabase.from('contacts').select('email').eq('org_id', orgId).not('email', 'is', null).limit(5),
    supabase.from('bookings').select('topic').eq('org_id', orgId).order('starts_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  const { data: run, error: runError } = await supabase
    .from('org_research')
    .insert({ org_id: orgId, status: 'running', requested_by: user!.email })
    .select('id')
    .single()

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

  try {
    const result = await researchOrganisation({
      name: org.name,
      website: org.website,
      city: org.city,
      province: org.province,
      segment: org.segment,
      contactEmails: (contacts ?? []).map((c: { email: string }) => c.email),
      topic: booking?.topic ?? null,
    })

    await supabase
      .from('org_research')
      .update({
        status: 'complete',
        model: result.model,
        brief_md: result.brief_md || null,
        sources: result.sources,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id)

    if (result.claims.length > 0) {
      const { error: claimError } = await supabase
        .from('org_research_claims')
        .insert(result.claims.map((c) => ({ ...c, research_id: run.id })))

      // Surfaced rather than swallowed: a run that shows a brief and no claims
      // because the insert failed looks exactly like an organisation nothing could
      // be found about, and the two need different responses.
      if (claimError) {
        console.error('[research] claims rejected:', claimError.message)
        return NextResponse.json(
          { error: `The briefing was saved, but the proposed facts were rejected: ${claimError.message}` },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ ok: true, runId: run.id, claims: result.claims.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Research failed.'
    console.error('[research]', message)
    await supabase
      .from('org_research')
      .update({ status: 'failed', error: message, completed_at: new Date().toISOString() })
      .eq('id', run.id)

    return NextResponse.json({ error: message }, { status: 502 })
  }
}
