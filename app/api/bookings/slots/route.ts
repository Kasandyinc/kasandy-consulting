import { NextRequest, NextResponse } from 'next/server'
import { getSlotStatuses, isDateBookable, getDayOfWeek, getDaySlots } from '@/lib/bookings'

/**
 * GET /api/bookings/slots?date=YYYY-MM-DD
 * Returns all PST time slots and their status for the given date.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 })
  }

  if (!isDateBookable(date)) {
    // Still return an empty slots object so the UI can handle it gracefully
    return NextResponse.json({ date, slots: {}, available: false })
  }

  const dayOfWeek = getDayOfWeek(date)
  const allSlots  = getDaySlots(dayOfWeek)

  if (!allSlots.length) {
    return NextResponse.json({ date, slots: {}, available: false })
  }

  const statuses = await getSlotStatuses(date)
  return NextResponse.json({ date, slots: statuses, available: true })
}
