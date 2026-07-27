import { getUpcomingBookings, getDaySlots, getDayOfWeek, getSlotStatuses, isDateBookable } from '@/lib/bookings'
import BookingActions from './BookingActions'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

function formatDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(y, mo - 1, d).toLocaleDateString('en-CA', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm} PST`
}

/** Generate the next 8 Tuesdays + Fridays from today */
function getUpcomingAvailableDays(): string[] {
  const days: string[] = []
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  while (days.length < 8) {
    const dow = d.getDay()
    if (dow === 2 || dow === 5) {
      const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      days.push(str)
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

export default async function AdminBookings() {
  const bookings = await getUpcomingBookings()
  const upcomingDays = getUpcomingAvailableDays()

  // Load slot statuses for each upcoming day
  const daySlotData = await Promise.all(
    upcomingDays.map(async dateStr => {
      const statuses = await getSlotStatuses(dateStr)
      return { dateStr, statuses }
    })
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-xs text-gray-400 hover:text-gray-600 mr-3">← Admin</Link>
          <span className="text-lg font-semibold text-gray-900">Bookings</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-12">

        {/* ── Upcoming Bookings ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Upcoming Bookings</h2>
          <p className="text-xs text-gray-500 mb-6">Strategy calls booked by clients. All times in PST.</p>

          {bookings.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 border border-dashed border-gray-200 text-center rounded">
              No upcoming bookings.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map(({ date, time, data }) => (
                <div key={`${date}:${time}`}
                  className="bg-white border border-gray-200 px-5 py-4 flex flex-wrap items-start gap-6">
                  <div className="min-w-[180px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">When</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(date)}</p>
                    <p className="text-sm text-gray-700">{formatTime(time)}</p>
                  </div>
                  <div className="min-w-[180px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Client</p>
                    <p className="text-sm font-semibold text-gray-900">{data.name}</p>
                    <a href={`mailto:${data.email}`} className="text-sm text-blue-600 hover:underline">{data.email}</a>
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Topic</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{data.topic}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400 shrink-0">
                    <p>Booked {new Date(data.bookedAt).toLocaleDateString('en-CA')}</p>
                    <p>{data.timezone}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Manage Availability ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Manage Availability</h2>
          <p className="text-xs text-gray-500 mb-6">
            Block specific slots or entire days (e.g. if you have other commitments on a Tuesday or Friday).
            Blocked slots are hidden from visitors.
          </p>

          <div className="space-y-6">
            {daySlotData.map(({ dateStr, statuses }) => {
              const allSlots = getDaySlots(getDayOfWeek(dateStr))
              const allBlocked = allSlots.every(t => statuses[t] === 'blocked' || statuses[t] === 'booked')
              const hasAnyBlocked = allSlots.some(t => statuses[t] === 'blocked')

              return (
                <div key={dateStr} className="bg-white border border-gray-200 px-5 py-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <p className="text-sm font-semibold text-gray-900">{formatDate(dateStr)}</p>
                    <BookingActions
                      dateStr={dateStr}
                      action={allBlocked ? 'unblockDay' : 'blockDay'}
                      label={allBlocked ? 'Unblock entire day' : 'Block entire day'}
                      variant="day"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {allSlots.map(time => {
                      const status = statuses[time] ?? 'available'
                      return (
                        <BookingActions
                          key={time}
                          dateStr={dateStr}
                          timeStr={time}
                          action={status === 'blocked' ? 'unblock' : 'block'}
                          label={formatTime(time)}
                          status={status}
                          variant="slot"
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </main>
    </div>
  )
}
