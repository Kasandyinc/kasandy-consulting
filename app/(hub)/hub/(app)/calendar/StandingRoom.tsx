'use client'

import { useState } from 'react'
import Link from 'next/link'

/**
 * The meeting room, somewhere a person can actually find it.
 *
 * It has always existed — the website puts it in every invite from the MEETING_LINK
 * environment variable — but it lived in a Vercel setting, so answering "can you send
 * me the link?" meant leaving the platform to look it up.
 */
export default function StandingRoom({ link }: { link: string | null }) {
  const [copied, setCopied] = useState(false)

  if (!link) {
    return (
      <div className="card" style={{ marginTop: 18, borderLeft: '3px solid var(--warn)' }}>
        <div className="card-b">
          <strong>No standing meeting room is set.</strong> Add one in{' '}
          <Link href="/admin">Settings</Link> and every call without its own link will
          use it — including the ones already booked.
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="card-b row between center wrap" style={{ gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            STANDING MEETING ROOM
          </div>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mono"
            style={{ fontSize: 12, wordBreak: 'break-all' }}
          >
            {link}
          </a>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link)
                setCopied(true)
                setTimeout(() => setCopied(false), 1800)
              } catch {
                /* selection and manual copy still work */
              }
            }}
          >
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <Link href="/admin" className="btn sm">
            Change
          </Link>
        </div>
      </div>
    </div>
  )
}
