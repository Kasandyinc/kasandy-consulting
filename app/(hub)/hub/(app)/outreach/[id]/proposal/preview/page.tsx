import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import type { ProposalModule } from '@/lib/engine/delivery'
import ProposalDocument from '@/app/(hub)/_components/ProposalDocument'
import PrintButton from '@/app/(hub)/_components/PrintButton'

export const dynamic = 'force-dynamic'

/**
 * The operator's Preview — the same ProposalDocument the client signing page
 * renders, same stylesheet, no approximation. This is what "Preview has been
 * opened for the current version" (a Send blocker) actually refers to: an operator
 * looking at exactly this, not a raw-markdown textarea.
 *
 * Reads the latest DRAFT proposal for the org — Preview only exists to check a
 * document before it is sent, so a proposal already sent (frozen, and visible to the
 * client at its own token URL) has nothing to preview here.
 */
export default async function ProposalPreviewPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isOperator(user?.email)) notFound()

  const [{ data: org }, { data: proposal }, { data: settings }] = await Promise.all([
    supabase.from('orgs').select('name').eq('id', params.id).maybeSingle(),
    supabase
      .from('proposals')
      .select('*')
      .eq('org_id', params.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('settings')
      .select('mailing_address, phone, signature_email, signature_name, signature_role, signature_logo_url, gst_number')
      .maybeSingle(),
  ])

  if (!org || !proposal) notFound()

  const [{ data: modules }, { data: contact }] = await Promise.all([
    supabase.from('proposal_modules').select('*').eq('proposal_id', proposal.id).order('position'),
    proposal.contact_id
      ? supabase.from('contacts').select('name').eq('id', proposal.contact_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return (
    <>
      <Link href={`/outreach/${params.id}/proposal`} className="btn sm">
        ← {proposal.number}
      </Link>

      <div style={{ marginTop: 14, marginBottom: 4 }}>
        <span className="tag ai">👁 Preview</span>{' '}
        <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>
          Exactly what {org.name} will see at the signing link. Clicking Preview from
          the builder is what clears the "Preview has not been opened" send blocker
          for the current saved version — edit and save again, and it reopens.
        </span>
      </div>

      <PrintButton />

      <ProposalDocument
        settings={
          settings ?? {
            mailing_address: null,
            phone: null,
            signature_email: null,
            signature_name: null,
            signature_role: null,
            signature_logo_url: null,
            gst_number: null,
          }
        }
        proposal={proposal}
        modules={(modules ?? []) as ProposalModule[]}
        orgName={org.name}
        contactName={contact?.name ?? null}
      />
    </>
  )
}
