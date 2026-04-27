import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

export type PageHeroConfig = {
  page: string
  image: string
  label: string
  title: string
  subtitle: string
  position: string
}

const DEFAULTS: PageHeroConfig[] = [
  { page: 'about',          image: '/images/hero-about.jpg',          label: 'Our Story',              title: 'About Kasandy Consulting',                    subtitle: 'Black women-owned consulting, advisory, and training firm based in Vancouver, BC.',     position: 'object-center' },
  { page: 'entrepreneurs',  image: '/images/hero-entrepreneurs.jpg',  label: 'Entrepreneurs & Founders', title: 'Build Bold. Scale Smart.',                  subtitle: 'Strategy, systems, and support for founders ready to grow with intention.',            position: 'object-center' },
  { page: 'government',     image: '/images/hero-government.jpg',     label: 'Government & Public Sector', title: 'Equity-Centered Public Service.',          subtitle: 'Helping government teams build inclusive policies, programs, and procurement processes.', position: 'object-center' },
  { page: 'nonprofits',     image: '/images/hero-nonprofits.jpg',     label: 'Non-Profit Organizations', title: 'Mission-Driven. Impact-Focused.',            subtitle: 'Capacity building, governance, and strategic planning for organizations that serve.',     position: 'object-center' },
  { page: 'kenya',          image: '/images/hero-kenya.jpg',          label: 'Kenya & International',  title: 'Africa Rising.',                              subtitle: 'Cross-border business development, trade facilitation, and investment readiness.',         position: 'object-center' },
  { page: 'speaking',       image: '/images/hero-speaking.jpg',       label: 'Speaking & Training',    title: 'Inspiring Rooms. Shifting Rooms.',             subtitle: 'Keynotes, workshops, and training that spark real change.',                             position: 'object-top' },
  { page: 'work',           image: '/images/hero-work.jpg',           label: 'Work & Results',         title: 'Proof in the Work.',                          subtitle: 'Case studies, outcomes, and impact across every sector we serve.',                       position: 'object-center' },
  { page: 'contact',        image: '/images/hero-contact.jpg',        label: 'Get in Touch',           title: 'Let\'s Build Something Together.',            subtitle: 'We\'d love to hear about your goals and how we can help.',                              position: 'object-center' },
  { page: 'services',       image: '',                                 label: 'Our Services',           title: 'Every Service, One Direction.',               subtitle: 'Integrated consulting, advisory, and training across every sector.',                     position: 'object-center' },
  { page: 'press',          image: '/images/hero-speaking.jpg',       label: 'Press & Media',          title: 'In the News.',                                subtitle: 'Media coverage, features, and press resources.',                                        position: 'object-center' },
  { page: 'resources',      image: '',                                 label: 'Resources',              title: 'Tools to Help You Grow.',                     subtitle: 'Guides, templates, and insights from the Kasandy team.',                               position: 'object-center' },
]

export async function GET() {
  const stored = await kvGet<PageHeroConfig[]>(KEYS.pageHeroes, DEFAULTS)
  // Merge with defaults to ensure all pages are represented
  const map = new Map(stored.map(h => [h.page, h]))
  DEFAULTS.forEach(d => { if (!map.has(d.page)) map.set(d.page, d) })
  return NextResponse.json(Array.from(map.values()))
}

export async function PATCH(req: NextRequest) {
  try {
    const { page, ...updates } = await req.json()
    if (!page) return NextResponse.json({ error: 'page is required' }, { status: 400 })

    const stored = await kvGet<PageHeroConfig[]>(KEYS.pageHeroes, DEFAULTS)
    const map = new Map(stored.map(h => [h.page, h]))
    DEFAULTS.forEach(d => { if (!map.has(d.page)) map.set(d.page, d) })

    const current = map.get(page)
    if (!current) return NextResponse.json({ error: 'Page not found' }, { status: 404 })

    const allowedKeys: (keyof PageHeroConfig)[] = ['image', 'label', 'title', 'subtitle', 'position']
    const sanitised = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowedKeys.includes(k as keyof PageHeroConfig))
    )

    map.set(page, { ...current, ...sanitised })
    await kvSet(KEYS.pageHeroes, Array.from(map.values()))
    return NextResponse.json(map.get(page))
  } catch {
    return NextResponse.json({ error: 'Failed to update hero' }, { status: 500 })
  }
}
