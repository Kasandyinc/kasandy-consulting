import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { blockSlot, unblockSlot, blockEntireDay, unblockEntireDay } from '@/lib/bookings'

function isAuthenticated(): boolean {
  const cookieStore = cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

/**
 * POST /api/bookings/block
 * Body: { action: 'block'|'unblock'|'blockDay'|'unblockDay', date, time? }
 * Admin-only.
 */
export async function POST(req: NextRequest) {
  if (!isAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { action, date, time } = await req.json() as {
    action: 'block' | 'unblock' | 'blockDay' | 'unblockDay'
    date: string
    time?: string
  }

  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  switch (action) {
    case 'block':
      if (!time) return NextResponse.json({ error: 'Missing time' }, { status: 400 })
      await blockSlot(date, time)
      break
    case 'unblock':
      if (!time) return NextResponse.json({ error: 'Missing time' }, { status: 400 })
      await unblockSlot(date, time)
      break
    case 'blockDay':
      await blockEntireDay(date)
      break
    case 'unblockDay':
      await unblockEntireDay(date)
      break
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
