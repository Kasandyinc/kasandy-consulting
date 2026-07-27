import Link from 'next/link'
import { SystemStrip } from '../../../_components/ui'

export const dynamic = 'force-dynamic'

// Modules that exist in the wireframe but are not wired to live data yet (§2, §12).
// The shell is built; phasing controls what is real. Rather than fake a screen with
// demo rows, each module states plainly which phase brings it to life.
const PHASES: Record<string, { title: string; phase: string; blurb: string }> = {
  clients: {
    title: 'Clients',
    phase: 'Phase 4',
    blurb:
      'Engagement workspaces, phase briefs, the client portal, and the Verified-live → invoice chain. Currently there are 0 clients — the real state is 29 prospects.',
  },
  marketing: {
    title: 'Marketing & Comms',
    phase: 'Phase 5',
    blurb: 'Campaigns, LinkedIn, and the monthly practice report.',
  },
  calendar: {
    title: 'Calendar & Meetings',
    phase: 'Phase 3',
    blurb: 'Booking → intake → discovery workspace, with two-way calendar sync.',
  },
  comms: {
    title: 'Comms Hub',
    phase: 'Phase 3',
    blurb: 'Threads, reply routing, and the notification feed.',
  },
  analytics: {
    title: 'Analytics',
    phase: 'Phase 5',
    blurb: 'Conversion funnel, template performance, and performance by segment.',
  },
  reports: {
    title: 'Report Studio',
    phase: 'Phase 5',
    blurb: 'Scheduled reports and the baseline → after story metrics.',
  },
  admin: {
    title: 'Admin',
    phase: 'Phase 4',
    blurb: 'Users, roles, and platform settings.',
  },
  cms: {
    title: 'Website CMS',
    phase: 'Phase 4–5',
    blurb:
      'Absorbs the existing /admin CMS: website forms post into the platform, and bookings, subscribers, submissions, testimonials and settings migrate off Vercel KV.',
  },
}

export default function ModulePlaceholder({ params }: { params: { slug: string[] } }) {
  const key = params.slug?.[0] ?? ''
  const mod = PHASES[key]

  return (
    <>
      <div className="eyebrow">{mod ? 'Module' : 'Not found'}</div>
      <h1 className="h1">{mod?.title ?? 'Nothing here'}</h1>
      <p className="lede">
        {mod?.blurb ?? 'That screen does not exist in the Engine.'}
      </p>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-b">
          {mod ? (
            <>
              <span className="tag warn">Arrives in {mod.phase}</span>
              <p style={{ marginTop: 12, color: 'var(--muted)' }}>
                The navigation and shell are built now so the platform reads whole. This
                module stays unwired until its phase, rather than showing invented data.
              </p>
            </>
          ) : (
            <Link href="/" className="btn sm">← Back to dashboard</Link>
          )}
        </div>
      </div>

      <SystemStrip>
        Phase 1 wires Outreach to live data only. Build order is revenue-ordered: 1 → 2 → 3
        → 4 → 5, each phase verified live before the next begins.
      </SystemStrip>
    </>
  )
}
