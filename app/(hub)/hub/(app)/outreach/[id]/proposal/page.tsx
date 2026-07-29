import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Proposal, ProposalModule, ServiceModule, ProposalSignature } from '@/lib/engine/delivery'
import type { Org, Contact } from '@/lib/engine/types'
import { SystemStrip } from '../../../../../_components/ui'
import ProposalBuilder from './ProposalBuilder'

export const dynamic = 'force-dynamic'

export default async function ProposalPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: org }, { data: proposalRow }, { data: catalogue }, { data: contacts }] =
    await Promise.all([
      supabase.from('orgs').select('*').eq('id', params.id).maybeSingle(),
      supabase
        .from('proposals')
        .select('*')
        .eq('org_id', params.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('service_modules').select('*').eq('active', true).order('position'),
      supabase.from('contacts').select('*').eq('org_id', params.id).order('name'),
    ])

  if (!org) notFound()
  const o = org as Org
  const proposal = (proposalRow ?? null) as Proposal | null

  const [{ data: chosen }, { data: signature }] = proposal
    ? await Promise.all([
        supabase.from('proposal_modules').select('*').eq('proposal_id', proposal.id).order('position'),
        supabase.from('proposal_signatures').select('*').eq('proposal_id', proposal.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }]

  return (
    <>
      <Link href={`/outreach/${params.id}`} className="btn sm">← {o.name}</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Proposal &amp; SOW</div>
        <h1 className="h1">{o.name}</h1>
        <p className="lede">
          Tick the modules, compose the Blueprint, send it for signature. Signing creates
          the client record and moves them to Won.
        </p>
      </div>

      <ProposalBuilder
        orgId={params.id}
        orgName={o.name}
        proposal={proposal}
        chosen={(chosen ?? []) as ProposalModule[]}
        catalogue={(catalogue ?? []) as ServiceModule[]}
        contacts={((contacts ?? []) as Contact[]).map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          title: c.title,
        }))}
        signature={(signature ?? null) as ProposalSignature | null}
      />

      <SystemStrip>
        A sent proposal is frozen by the database — the copy the client is reading cannot
        change beneath them. Signing records the signer, the time, and a hash of exactly
        what they agreed to, then creates the client in the same transaction.
      </SystemStrip>
    </>
  )
}
