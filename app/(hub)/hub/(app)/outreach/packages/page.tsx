import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../../_components/ui'
import PackagePanel from './PackagePanel'

export const dynamic = 'force-dynamic'

/**
 * Org packages — the tailored demo and proposal each prospect is sent.
 *
 * These existed on a laptop while the outreach engine referenced them in three
 * notification templates. This is where they get into the platform and become
 * links a prospect can actually open.
 */
export default async function PackagesPage() {
  const supabase = createClient()

  const [{ data: orgs }, { count: views }] = await Promise.all([
    supabase
      .from('orgs')
      .select('id, name, stage, demo_object, proposal_object, package_token, detail_hook')
      .order('name'),
    supabase.from('demo_views').select('id', { count: 'exact', head: true }),
  ])

  const rows = (orgs ?? []) as {
    id: string
    name: string
    stage: string
    demo_object: string | null
    proposal_object: string | null
    package_token: string
    detail_hook: string | null
  }[]

  const withDemo = rows.filter((o) => o.demo_object).length
  const withProposal = rows.filter((o) => o.proposal_object).length
  const withHook = rows.filter((o) => o.detail_hook).length

  return (
    <>
      <div className="eyebrow">Outreach</div>
      <h1 className="h1">Org packages</h1>
      <p className="lede">
        The tailored demo and proposal for each prospect, and the research behind them.
        Upload the handover zip once — the packages go into private storage and the
        research fills in the fields the composer has been waiting on.
      </p>

      <PackagePanel
        orgs={rows}
        totals={{ orgs: rows.length, withDemo, withProposal, withHook, views: views ?? 0 }}
        publicBase={process.env.NEXT_PUBLIC_URL ?? 'https://kasandyconsulting.com'}
      />

      <SystemStrip>
        Packages live in a private bucket and are streamed through a token route, so
        the storage path is never exposed and a tailored pitch for a named
        organisation is never on a guessable URL. Every opening is recorded against
        the prospect — that is the fact the follow-up call was always meant to turn
        on. An import never overwrites a field an operator has edited by hand, and a
        package it cannot match to exactly one organisation is reported rather than
        attached to a guess.
      </SystemStrip>
    </>
  )
}
