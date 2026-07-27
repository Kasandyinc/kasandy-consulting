import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatMoney } from '@/lib/engine/money'
import { SystemStrip } from '../../../../_components/ui'
import DeliveryWorkspace from './DeliveryWorkspace'

export const dynamic = 'force-dynamic'

export default async function ClientRecord({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*, orgs(id, name, segment, province)')
    .eq('id', params.id)
    .maybeSingle()

  if (!client) notFound()

  const [{ data: engagements }, { data: users }, { data: invoices }] = await Promise.all([
    supabase.from('engagements').select('*').eq('client_id', params.id),
    supabase.from('client_users').select('*').eq('client_id', params.id).order('created_at'),
    supabase.from('invoices').select('*').eq('client_id', params.id),
  ])

  const engagementIds = (engagements ?? []).map((e: { id: string }) => e.id)
  const { data: phases } = engagementIds.length
    ? await supabase.from('engagement_phases').select('*').in('engagement_id', engagementIds).order('position')
    : { data: [] }

  const phaseIds = (phases ?? []).map((p: { id: string }) => p.id)
  const { data: deliverables } = phaseIds.length
    ? await supabase.from('deliverables').select('*').in('phase_id', phaseIds).order('position')
    : { data: [] }

  const org = client.orgs as { id: string; name: string; segment: string | null } | null

  return (
    <>
      <Link href="/clients" className="btn sm">← Clients</Link>

      <div className="row between center wrap" style={{ marginTop: 14 }}>
        <div>
          <div className="eyebrow">Client</div>
          <h1 className="h1">{org?.name ?? 'Client'}</h1>
          <p className="lede">
            {[org?.segment, client.signed_on && `Signed ${client.signed_on}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        {org && (
          <Link href={`/outreach/${org.id}`} className="btn sm">
            Prospect record →
          </Link>
        )}
      </div>

      <DeliveryWorkspace
        clientId={params.id}
        engagements={(engagements ?? []) as never}
        phases={(phases ?? []) as never}
        deliverables={(deliverables ?? []) as never}
        users={(users ?? []) as never}
        invoices={((invoices ?? []) as { phase_id: string | null; number: string; status: string; amount_cents: number }[]).map(
          (i) => ({ phase_id: i.phase_id, number: i.number, status: i.status, amount: formatMoney(i.amount_cents) }),
        )}
      />

      <SystemStrip>
        Only a client user can mark a phase verified live — the database refuses it from
        an operator account, including yours. Verification is one-way from the portal,
        because an invoice may already have been issued against it.
      </SystemStrip>
    </>
  )
}
