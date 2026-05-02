import { NextResponse } from 'next/server'
import { kv, KEYS } from '@/lib/kv'

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
  const [newsletter, downloads] = await Promise.all([
    readList(KEYS.newsletterSubscribers),
    readList(KEYS.resourceDownloads),
  ])
  return NextResponse.json({ newsletter, downloads })
}
