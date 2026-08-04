import { NextRequest, NextResponse } from 'next/server'
import { kv } from '@/lib/kv'
import { requireAdmin } from '@/lib/admin-guard'

type SeminarInfo = {
  nextDates: string
  location: string
  earlyBirdPrice: string
  standardPrice: string
  registrationOpen: boolean
  registrationNote: string
  sessionTime: string
}

const KEY = 'kenya:seminar'

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const data = await kv.get<SeminarInfo>(KEY)
    return NextResponse.json(data ?? null)
  } catch (err) {
    console.error('[kenya-seminar GET]', err)
    return NextResponse.json({ error: 'Failed to fetch seminar info' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  try {
    const body = await req.json() as SeminarInfo
    await kv.set(KEY, body)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[kenya-seminar PATCH]', err)
    return NextResponse.json({ error: 'Failed to update seminar info' }, { status: 500 })
  }
}
