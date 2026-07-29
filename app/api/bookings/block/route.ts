import { NextRequest, NextResponse } from 'next/server'
import { blockSlot, unblockSlot, blockEntireDay, unblockEntireDay } from '@/lib/bookings'
import { requireAdmin } from '@/lib/admin-guard'

/**
 * POST /api/bookings/block
 * Body: { action: 'block'|'unblock'|'blockDay'|'unblockDay', date, time? }
 * Admin-only.
 *
 * This compared the session cookie to the literal 'authenticated'. It is not under
 * /api/admin, so middleware never gated it either — the route's own check was the
 * only one, and a fixed string is not a check. Now shares the signed-session guard.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

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
