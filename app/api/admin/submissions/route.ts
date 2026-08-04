import { NextResponse } from 'next/server'
import { kv, KEYS } from '@/lib/kv'
import { requireAdmin } from '@/lib/admin-guard'

async function readList(key: string) {
  try {
    const len = await kv.llen(key)
    if (!len) return []
    const raw = await kv.lrange(key, 0, len - 1)
    return raw.map(r => {
      try { return typeof r === 'string' ? JSON.parse(r) : r } catch { return r }
    })
  } catch { return [] }
}

export async function GET() {
  const denied = await requireAdmin()
  if (denied) return denied

  const [contact, speaking, kenya] = await Promise.all([
    readList(KEYS.contactSubmissions),
    readList(KEYS.speakingSubmissions),
    readList(KEYS.kenyaWaitlist),
  ])
  return NextResponse.json({ contact, speaking, kenya })
}
