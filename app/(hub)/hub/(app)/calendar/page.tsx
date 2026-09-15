import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SystemStrip } from '../../../_components/ui'
import BookingRow, { type BookingWithOrg } from './BookingRow'
import StandingRoom from './StandingRoom'

export const dynamic = 'force-dynamic'

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

  const [{ data, error }, { data: settings }, { data: orgRows }] = await Promise.all([
    supabase.from('bookings').select('*, orgs(id, name)').order('starts_at', { ascending: !showPast }),
    supabase.from('settings').select('default_meeting_link').maybeSingle(),
    supabase.from('orgs').select('id, name').order('name'),
  ])

  // The standing room, in the order of who has the better claim to be right: the
  // booking's own link, then the one Jackee can edit in Settings, then the
  // environment variable the website has been using all along. The last is the
  // reason the two backfilled calls have a working Join button without anyone
  // having to type anything in.
  const fallbackLink =
    settings?.default_meeting_link?.trim() || process.env.MEETING_LINK?.trim() || null

  const orgs = (orgRows ?? []) as { id: string; name: string }[]
  const rows = (data ?? []) as BookingWithOrg[]
  const now = Date.now()
  const upcoming = rows.filter((b) => new Date(b.starts_at).getTime() >= now)
  const past = rows.filter((b) => new Date(b.starts_at).getTime() < now)
  const shown = showPast ? past : upcoming

  const needsAction = rows.filter((b) => b.status === 'requested').length
  // A booking with no organisation cannot become an intake, and so cannot become a
  // discovery, a proposal, or an invoice. It is the one break in the chain.
  const unlinked = rows.filter(
    (b) => !b.orgs && b.status !== 'cancelled' && b.status !== 'no_show',
  ).length

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

      <StandingRoom link={fallbackLink} />

      {needsAction > 0 && !showPast && (
        <div className="card" style={{ marginTop: 18, borderLeft: '3px solid var(--warn)' }}>
          <div className="card-b">
            <strong>{needsAction}</strong> booking{needsAction === 1 ? '' : 's'} still marked
            requested — confirm or cancel so the slot is not held by accident.
          </div>
        </div>
      )}

      {unlinked > 0 && (
        <div className="card" style={{ marginTop: 18, borderLeft: '3px solid var(--warn)' }}>
          <div className="card-b">
            <strong>{unlinked}</strong> booking{unlinked === 1 ? ' is' : 's are'} not attached
            to an organisation. Nothing after the call — intake, discovery, proposal,
            invoice — can start until they are. Open <b>Notes &amp; link</b> on the row to
            attach one.
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
              <th>Meeting</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                when={when(b.starts_at, b.timezone)}
                resolvedLink={b.meeting_link?.trim() || fallbackLink}
                linkIsFallback={!b.meeting_link?.trim()}
                orgs={orgs}
              />
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
        Attaching a booking to an organisation is what lets the rest of the engine run:
        call → intake → discovery → proposal → signature, and a signature creates the
        client, the engagement and the invoice by itself.{' '}
        <Link href="/clients">Clients →</Link>
      </SystemStrip>
    </>
  )
}
