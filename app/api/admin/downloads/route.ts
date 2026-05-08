import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'
import type { Download } from '@/types/downloads'
import { DEFAULT_DOWNLOADS } from '@/data/downloads'

export type { Download }

export async function GET() {
  const kvData = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
  // Merge: KV values take precedence, but always include all default products
  const kvMap = new Map(kvData.map(d => [d.id, d]))
  const merged = DEFAULT_DOWNLOADS.map(def => kvMap.get(def.id) ?? def)
  return NextResponse.json(merged)
}

export async function PATCH(req: NextRequest) {
  try {
    const patch = await req.json()
    const { id, ...fields } = patch
    const kvData = await kvGet<Download[]>(KEYS.downloads, DEFAULT_DOWNLOADS)
    const kvMap = new Map(kvData.map((d: Download) => [d.id, d]))
    const merged = DEFAULT_DOWNLOADS.map(def => kvMap.get(def.id) ?? def)
    const updated = merged.map(d => d.id === id ? { ...d, ...fields } : d)
    await kvSet(KEYS.downloads, updated)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update download' }, { status: 500 })
  }
}
