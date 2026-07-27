import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BOOKING_STATUS_LABEL, type Booking, type BookingStatus } from '@/lib/engine/delivery'
import { SystemStrip } from '../../../_components/ui'
import BookingRow from './BookingRow'

export const dynamic = 'force-dynamic'

const TAG_FOR: Record<BookingStatus, string> = {
  requested: 'warn',
  confirmed: 'good',
  held: 'info',
  done: 'good',
  no_show: 'bad',
  cancelled: 'hold',
}

function when(iso: string, tz: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { show?: string }
}) {
  const supabase = createClient()
  const showPast = searchParams.show === 'past'

  const { data, error } = await supabase
    .from('bookings')
    .select('*, orgs(id, name)')
    .order('starts_at', { ascending: !showPast })

  const rows = (data ?? []) as (Booking & { orgs: { id: string; name: string } | null })[]
  const now = Date.now()
  const upcoming = rows.filter((b) => new Date(b.starts_at).getTime() >= now)
  const past = rows.filter((b) => new Date(b.starts_at).getTime() < now)
  const shown = showPast ? past : upcoming

  const needsAction = rows.filter((b) => b.status === 'requested').length

  return (
    <>
      <div className="row between center wrap">
        <div>
          <div className="eyebrow">Operate</div>
          <h1 className="h1">Calendar &amp; meetings</h1>
          <p className="lede">
            Discovery calls, from the website and from here. A booking that has happened
            becomes the start of an intake.
          </p>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Link href="/calendar" className={`btn sm${!showPast ? ' ox' : ''}`}>
            Upcoming ({upcoming.length})
          </Link>
          <Link href="/calendar?show=past" className={`btn sm${showPast ? ' ox' : ''}`}>
            Past ({past.length})
          </Link>
        </div>
      </div>

      {error && (
        <div className="err" style={{ marginTop: 18 }}>
          Could not read bookings: {error.message}
        </div>
      )}

      {needsAction > 0 && !showPast && (
        <div className="card" style={{ marginTop: 18, borderLeft: '3px solid var(--warn)' }}>
          <div className="card-b">
            <strong>{needsAction}</strong> booking{needsAction === 1 ? '' : 's'} still marked
            requested — confirm or cancel so the slot is not held by accident.
          </div>
        </div>
      )}

      <div className="grid g4" style={{ marginTop: 18 }}>
        <div className="stat">
          <div className="n">{upcoming.length}</div>
          <div className="l">Upcoming</div>
        </div>
        <div className="stat w">
          <div className="n">{needsAction}</div>
          <div className="l">Awaiting confirmation</div>
        </div>
        <div className="stat g">
          <div className="n">{past.filter((b) => b.status === 'done').length}</div>
          <div className="l">Calls held</div>
        </div>
        <div className="stat i">
          <div className="n">{past.filter((b) => b.status === 'no_show').length}</div>
          <div className="l">No-shows</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-h between">
          <h3>{showPast ? 'Past calls' : 'Upcoming calls'}</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            times shown in each booking&apos;s own timezone
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Organisation</th>
              <th>Topic</th>
              <th>Source</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <tr key={b.id}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600 }}>{when(b.starts_at, b.timezone)}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {b.duration_mins} min · {b.timezone.split('/')[1]?.replace('_', ' ')}
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{b.name}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {b.email}
                  </div>
                </td>
                <td>
                  {b.orgs ? (
                    <Link href={`/outreach/${b.orgs.id}`}>{b.orgs.name}</Link>
                  ) : (
                    <span style={{ color: 'var(--muted)' }}>{b.organisation ?? '—'}</span>
                  )}
                </td>
                <td style={{ maxWidth: 220 }}>{b.topic ?? '—'}</td>
                <td>
                  <span className="tag">{b.source}</span>
                </td>
                <td>
                  <span className={`tag ${TAG_FOR[b.status]}`}>{BOOKING_STATUS_LABEL[b.status]}</span>
                </td>
                <td>
                  <BookingRow booking={b} />
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="empty">
                  {showPast ? 'No calls have happened yet.' : 'Nothing booked.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SystemStrip>
        The database refuses two bookings in the same slot, so the website and this
        screen cannot double-book between them. Cancelling a booking releases the slot.
      </SystemStrip>
    </>
  )
}
