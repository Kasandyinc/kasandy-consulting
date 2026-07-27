import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatMoney } from '@/lib/engine/money'
import type { ProposalModule } from '@/lib/engine/delivery'
import SignPanel from './SignPanel'
import { mdToHtml } from '@/lib/engine/proposal-md'

export const dynamic = 'force-dynamic'

/**
 * The proposal as the client sees it, opened with a token.
 *
 * A draft is never visible here: until KC sends it, this returns not-found, so a
 * leaked token cannot expose working copy. What is shown is the frozen document —
 * the database refuses edits to it — which is why the signature can honestly claim
 * to be against exactly this text.
 */
export default async function ProposalPage({ params }: { params: { token: string } }) {
  if (!/^[0-9a-f]{32,64}$/i.test(params.token)) notFound()

  const supabase = createAdminClient()
  const { data: proposal } = await supabase
    .from('proposals')
    .select('*')
    .eq('token', params.token)
    .maybeSingle()

  if (!proposal || proposal.status === 'draft') notFound()

  const [{ data: modules }, { data: signature }, { data: org }] = await Promise.all([
    supabase.from('proposal_modules').select('*').eq('proposal_id', proposal.id).order('position'),
    supabase.from('proposal_signatures').select('*').eq('proposal_id', proposal.id).maybeSingle(),
    supabase.from('orgs').select('name').eq('id', proposal.org_id).maybeSingle(),
  ])

  const mods = (modules ?? []) as ProposalModule[]
  const expired =
    proposal.valid_until && new Date(proposal.valid_until) < new Date() && !signature

  return (
    <>
      <div className="row between center wrap" style={{ gap: 10 }}>
        <div>
          <div className="eyebrow">Proposal {proposal.number}</div>
          <h1 className="h1">{proposal.title}</h1>
          <p className="lede">Prepared for {org?.name ?? 'your organisation'}</p>
        </div>
        {signature && <span className="tag good">✓ Signed</span>}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="card-b">
          <div
            style={{ lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: mdToHtml(proposal.blueprint_md) }}
          />
        </div>
      </div>

      {mods.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h"><h3>What is included</h3></div>
          <table>
            <tbody>
              {mods.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    {m.summary && (
                      <div style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 3 }}>{m.summary}</div>
                    )}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {formatMoney(m.price_cents * m.quantity)}
                  </td>
                </tr>
              ))}
              <tr>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td
                  className="mono"
                  style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  {formatMoney(proposal.total_cents)}
                </td>
              </tr>
              {proposal.deposit_cents > 0 && (
                <tr>
                  <td style={{ color: 'var(--muted)' }}>Deposit on signature</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                    {formatMoney(proposal.deposit_cents)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h"><h3>Terms</h3></div>
        <div className="card-b">
          <div
            style={{ lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: mdToHtml(proposal.terms_md) }}
          />
        </div>
      </div>

      {signature ? (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid var(--good)' }}>
          <div className="card-b">
            <strong>Signed by {signature.signer_name}</strong>
            {signature.signer_title ? `, ${signature.signer_title}` : ''} on{' '}
            {new Date(signature.signed_at).toLocaleDateString('en-CA')}.
            <div className="prov" style={{ marginTop: 6 }}>
              document hash <b>{signature.document_hash}</b>
            </div>
            <p style={{ color: 'var(--muted)', marginTop: 10, fontSize: 12.5 }}>
              Keep this link — it is your copy of what was agreed. The hash above covers the
              text on this page; if any of it were altered later, it would no longer match.
            </p>
          </div>
        </div>
      ) : expired ? (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid var(--warn)' }}>
          <div className="card-b">
            This proposal was valid until {proposal.valid_until}. Get in touch and we will
            send a current one.
          </div>
        </div>
      ) : proposal.status === 'declined' ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-b" style={{ color: 'var(--muted)' }}>
            This proposal was declined. Nothing further is needed.
          </div>
        </div>
      ) : (
        <SignPanel
          token={params.token}
          total={formatMoney(proposal.total_cents)}
          deposit={formatMoney(proposal.deposit_cents)}
        />
      )}
    </>
  )
}
