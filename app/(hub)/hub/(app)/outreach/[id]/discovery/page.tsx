import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SEVERITY_ORDER, type Discovery, type DiscoveryFinding, type Intake, type IntakeQuestion } from '@/lib/engine/delivery'
import type { Org } from '@/lib/engine/types'
import { SystemStrip } from '../../../../../_components/ui'
import DiscoveryWorkspace from './DiscoveryWorkspace'

export const dynamic = 'force-dynamic'

export default async function DiscoveryPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: org }, { data: discoveryRow }, { data: intakeRow }] = await Promise.all([
    supabase.from('orgs').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('discoveries').select('*').eq('org_id', params.id).maybeSingle(),
    supabase
      .from('intakes')
      .select('*, intake_forms(name, questions)')
      .eq('org_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!org) notFound()
  const o = org as Org
  const discovery = (discoveryRow ?? null) as Discovery | null

  const [{ data: findingRows }, { data: assessment }] = discovery
    ? await Promise.all([
        supabase.from('discovery_findings').select('*').eq('discovery_id', discovery.id),
        supabase.from('assessments').select('*').eq('discovery_id', discovery.id).maybeSingle(),
      ])
    : [{ data: [] }, { data: null }]

  const findings = ((findingRows ?? []) as DiscoveryFinding[])
    .slice()
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const intake = (intakeRow ?? null) as (Intake & {
    intake_forms: { name: string; questions: IntakeQuestion[] } | null
  }) | null

  return (
    <>
      <Link href={`/outreach/${params.id}`} className="btn sm">← {o.name}</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Discovery</div>
        <h1 className="h1">{o.name}</h1>
        <p className="lede">
          What they told us, what we found, and the assessment that comes out of it.
        </p>
      </div>

      <DiscoveryWorkspace
        orgId={params.id}
        orgName={o.name}
        discovery={discovery}
        findings={findings}
        assessment={
          assessment
            ? {
                id: assessment.id,
                title: assessment.title,
                body_md: assessment.body_md,
                published_at: assessment.published_at,
              }
            : null
        }
        intake={
          intake
            ? {
                id: intake.id,
                status: intake.status,
                token: intake.token,
                submittedAt: intake.submitted_at,
                answers: (intake.answers ?? {}) as Record<string, string>,
                questions: (intake.intake_forms?.questions ?? [])
                  .slice()
                  .sort((a, b) => a.order - b.order),
              }
            : null
        }
      />

      <SystemStrip>
        The assessment is composed from the findings on record, each with the evidence it
        rests on — nothing in it is written that the workspace does not hold. Publishing
        stops it being regenerated over.
      </SystemStrip>
    </>
  )
}
