import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  STAGE_LABEL,
  sendBlockers,
  type Org,
  type Contact,
  type ConsentRow,
  type Stage,
} from '@/lib/engine/types'
import { SystemStrip, Provenance, OrgFlags } from '../../../../_components/ui'
import SignOffButton from './SignOffButton'

export const dynamic = 'force-dynamic'

const TABS = ['overview', 'sequence', 'consent', 'notes'] as const
type Tab = (typeof TABS)[number]

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        className="mono"
        style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)' }}
      >
        {label}
      </div>
      <div style={{ marginTop: 3 }}>{value ?? <span style={{ color: 'var(--muted)' }}>—</span>}</div>
    </div>
  )
}

export default async function OrgRecord({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { tab?: string }
}) {
  const supabase = createClient()

  const [{ data: org }, { data: contactRows }, { data: consentRows }, { data: sequences }] =
    await Promise.all([
      supabase.from('orgs').select('*').eq('id', params.id).maybeSingle(),
      supabase.from('contacts').select('*').eq('org_id', params.id).order('name'),
      supabase.from('consent_ledger').select('*').eq('org_id', params.id),
      supabase.from('sequences').select('*, sequence_steps(*)').eq('org_id', params.id),
    ])

  if (!org) notFound()

  const o = org as Org
  const contacts = (contactRows ?? []) as Contact[]
  const consent = (consentRows ?? []) as ConsentRow[]
  const blockers = sendBlockers(o, contacts, consent)
  const tab = (TABS.includes(searchParams.tab as Tab) ? searchParams.tab : 'overview') as Tab

  return (
    <>
      <Link href="/outreach" className="btn sm" style={{ marginBottom: 16 }}>
        ← Outreach
      </Link>

      <div className="row between center wrap" style={{ marginTop: 8 }}>
        <div>
          <div className="eyebrow">Prospect</div>
          <h1 className="h1">{o.name}</h1>
          <p className="lede">
            {[o.segment, o.province, o.priority_label && `Priority: ${o.priority_label}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <OrgFlags org={o} />
            <span className="tag">{STAGE_LABEL[o.stage as Stage] ?? o.stage}</span>
          </div>
          <Link
            href={`/outreach/${o.id}/compose`}
            className={`btn sm ${blockers.length === 0 ? 'ox' : ''}`}
            style={{ marginTop: 10 }}
          >
            ✉ Compose
          </Link>
        </div>
      </div>

      {/* Refusal notice — say why, plainly, before anyone tries to send. */}
      {blockers.length > 0 && (
        <div className="err" style={{ marginTop: 18 }}>
          <strong>Sending is refused for this org.</strong>
          <ul style={{ margin: '6px 0 0 18px' }}>
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          {o.black_led && o.signoff_status === 'pending' && (
            <div style={{ marginTop: 10 }}>
              <SignOffButton orgId={o.id} orgName={o.name} />
            </div>
          )}
        </div>
      )}

      {o.tailoring_caution && (
        <div className="card" style={{ marginTop: 16, borderLeft: '3px solid var(--warn)' }}>
          <div className="card-b">
            <div className="eyebrow" style={{ color: 'var(--warn)' }}>Tailoring caution</div>
            <div>{o.tailoring_caution}</div>
          </div>
        </div>
      )}

      <div className="tabs">
        {TABS.map((t) => (
          <Link key={t} href={`/outreach/${o.id}?tab=${t}`} className={`tab${tab === t ? ' on' : ''}`}>
            {t[0].toUpperCase() + t.slice(1)}
          </Link>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid g2">
          <div className="card">
            <div className="card-h"><h3>Leader</h3></div>
            <div className="card-b">
              {o.leader_name ? (
                <>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{o.leader_name}</div>
                  <div style={{ color: 'var(--muted)' }}>{o.leader_title}</div>
                  <Provenance source={o.leader_source} on={o.leader_verified_on} />
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--muted)' }}>
                    No leader asserted. Names are only stored with a source and a date.
                  </p>
                  <Provenance source={null} on={null} />
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-h"><h3>Fit</h3></div>
            <div className="card-b">
              <Field label="Why they fit" value={o.why_fit} />
              <Field label="Section 1.3 angle" value={o.angle_13} />
              <Field label="Pain hypothesis" value={o.pain_hypothesis} />
            </div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-h between">
              <h3>Contacts</h3>
              <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                {contacts.length} on file
              </span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Title</th><th>Email</th><th>Status</th><th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name ?? '—'}</td>
                    <td>{c.title ?? '—'}</td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{c.email ?? '—'}</td>
                    <td>
                      <span className={`tag ${c.email_status === 'confirmed' ? 'good' : 'warn'}`}>
                        {c.email_status}
                        {c.email_status_raw ? ` · ${c.email_status_raw}` : ''}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 11.5 }}>{c.phone ?? '—'}</td>
                  </tr>
                ))}
                {contacts.length === 0 && (
                  <tr><td colSpan={5} className="empty">No contacts on file — this org has no route.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'sequence' && (
        <div className="card">
          <div className="card-h"><h3>Sequence</h3></div>
          <div className="card-b">
            {(sequences ?? []).length === 0 ? (
              <p className="empty">
                No sequence staged. Templates, the composer, and the send-gate arrive in the next PR.
              </p>
            ) : (
              <pre className="mono" style={{ fontSize: 11.5 }}>
                {JSON.stringify(sequences, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {tab === 'consent' && (
        <div className="card">
          <div className="card-h"><h3>Consent ledger</h3></div>
          <table>
            <thead>
              <tr><th>Basis</th><th>Source</th><th>Recorded</th><th>Opt-out</th></tr>
            </thead>
            <tbody>
              {consent.map((c) => (
                <tr key={c.id}>
                  <td>{c.basis}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{c.source_url ?? '—'}</td>
                  <td className="mono" style={{ fontSize: 11 }}>{c.recorded_on}</td>
                  <td>
                    {c.optout_at ? (
                      <span className="tag bad">opted out {c.optout_at.slice(0, 10)}</span>
                    ) : (
                      <span className="tag good">active</span>
                    )}
                  </td>
                </tr>
              ))}
              {consent.length === 0 && (
                <tr><td colSpan={4} className="empty">No lawful basis recorded — sending is refused.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'notes' && (
        <div className="card">
          <div className="card-h"><h3>Notes</h3></div>
          <div className="card-b">
            <Field label="Next action" value={o.next_action} />
            <Field label="Notes" value={o.notes} />
            <Field label="Grant trigger" value={o.grant_trigger} />
            <Field label="Trigger source" value={o.trigger_source} />
            {o.hold && <Field label="Hold reason" value={o.hold_reason} />}
          </div>
        </div>
      )}

      <SystemStrip>
        Record read from Supabase (ca-central-1). Provenance, HOLD, sign-off, consent and
        suppression are enforced by database constraints — this screen reports them, it does
        not decide them.
      </SystemStrip>
    </>
  )
}
