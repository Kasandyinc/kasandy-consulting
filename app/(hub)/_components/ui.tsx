import type { Org } from '@/lib/engine/types'

/**
 * Provenance receipt (brief §0/§4): a fact about a person is always rendered with
 * its source and date, in small mono type. No receipt, no claim.
 */
export function Provenance({ source, on }: { source: string | null; on: string | null }) {
  if (!source || !on) {
    return <div className="prov">src: <b>unverified</b> — leader not asserted</div>
  }
  return (
    <div className="prov">
      src: <b>{source}</b> · verified {on}
    </div>
  )
}

/** The SYSTEM strip that closes every screen: what ran unattended. */
export function SystemStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="sys">
      <span className="lbl">SYSTEM</span>
      {children}
    </div>
  )
}

/** Status flags for an org, in the order that matters operationally. */
export function OrgFlags({ org }: { org: Org }) {
  return (
    <>
      {org.hold && <span className="tag hold">◼ HOLD</span>}
      {org.black_led && org.signoff_status === 'pending' && (
        <span className="tag warn">⚑ Sign-off required</span>
      )}
      {org.black_led && org.signoff_status === 'approved' && (
        <span className="tag good">✓ Signed off</span>
      )}
      {org.leader_name && <span className="tag good">✓ Leader verified</span>}
      {org.trigger_status && <span className="tag info">◈ {org.trigger_status}</span>}
    </>
  )
}
