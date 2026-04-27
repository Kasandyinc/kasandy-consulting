import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

export type SiteSettings = {
  heroTagline: string
  heroSubtext: string
  ctaLabel: string
  ctaHref: string
  announcementBar: string
  announcementBarEnabled: boolean
  bookingUrl: string
  instagramUrl: string
  linkedinUrl: string
  whatsappNumber: string
}

const DEFAULTS: SiteSettings = {
  heroTagline: 'Where Ambition Meets Access.',
  heroSubtext: 'Strategy, systems, and support for leaders ready to grow.',
  ctaLabel: 'Work With Us',
  ctaHref: '/contact',
  announcementBar: '',
  announcementBarEnabled: false,
  bookingUrl: '',
  instagramUrl: 'https://instagram.com/kasandyinc',
  linkedinUrl: 'https://www.linkedin.com/in/jackeekasandy',
  whatsappNumber: '17783854480',
}

export async function GET() {
  const settings = await kvGet<SiteSettings>(KEYS.siteSettings, DEFAULTS)
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  try {
    const updates = await req.json()

    const allowedKeys = Object.keys(DEFAULTS) as (keyof SiteSettings)[]
    const sanitised = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowedKeys.includes(k as keyof SiteSettings))
    )

    const current = await kvGet<SiteSettings>(KEYS.siteSettings, DEFAULTS)
    const merged = { ...current, ...sanitised }
    await kvSet(KEYS.siteSettings, merged)
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
