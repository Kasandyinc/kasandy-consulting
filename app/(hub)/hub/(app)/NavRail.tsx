'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Navigation mirrors the wireframe rail. Modules beyond Outreach are present but
// unwired in Phase 1 — they render their phase notice rather than pretending.
const GROUPS: { group: string; items: { href: string; icon: string; label: string; soon?: boolean }[] }[] = [
  {
    group: 'Overview',
    items: [{ href: '/', icon: '◧', label: 'Dashboard' }],
  },
  {
    group: 'Grow',
    items: [
      { href: '/outreach', icon: '↗', label: 'Outreach' },
      { href: '/clients', icon: '◆', label: 'Clients', soon: true },
    ],
  },
  {
    group: 'Money',
    items: [{ href: '/financials', icon: '$', label: 'Financials', soon: true }],
  },
  {
    group: 'Reach',
    items: [{ href: '/marketing', icon: '✎', label: 'Marketing & Comms', soon: true }],
  },
  {
    group: 'Operate',
    items: [
      { href: '/calendar', icon: '▦', label: 'Calendar & Meetings', soon: true },
      { href: '/comms', icon: '✦', label: 'Comms Hub', soon: true },
    ],
  },
  {
    group: 'Measure',
    items: [
      { href: '/analytics', icon: '▲', label: 'Analytics', soon: true },
      { href: '/reports', icon: '▤', label: 'Report Studio', soon: true },
    ],
  },
  {
    group: 'System',
    items: [
      { href: '/admin', icon: '⚙', label: 'Admin', soon: true },
      { href: '/cms', icon: '◱', label: 'Website CMS', soon: true },
    ],
  },
]

export default function NavRail() {
  const pathname = usePathname() || '/'

  return (
    <nav className="navwrap">
      {GROUPS.map((g) => (
        <div key={g.group}>
          <div className="navgroup">{g.group}</div>
          {g.items.map((it) => {
            const on = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href)
            return (
              <Link key={it.href} href={it.href} className={`ni${on ? ' on' : ''}`}>
                <span className="ico">{it.icon}</span>
                {it.label}
                {it.soon && <span className="badge">soon</span>}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
