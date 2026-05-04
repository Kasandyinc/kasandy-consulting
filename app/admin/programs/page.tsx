'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

type Program = {
  tier: string
  subtitle: string
  fromPrice: string
  description: string
  includes: string[]
  outcome?: string
  ideal?: string
  featured?: boolean
  requestProposal?: boolean
  ctaLabel?: string
  ctaHref?: string
}

type ProgramsData = {
  entrepreneurs: Program[]
  nonprofits: Program[]
  government: Program[]
}

const AUDIENCES = ['Entrepreneurs', 'Non-Profits', 'Government'] as const
type Audience = typeof AUDIENCES[number]

const DEFAULTS: ProgramsData = {
  entrepreneurs: [
    {
      tier: 'Foundation',
      subtitle: '90-Day Coaching Program',
      fromPrice: 'Investment — quoted after Discovery Session',
      description: 'For founders establishing systems and direction — early stage to $500K revenue. Builds your foundation for procurement readiness in 90 days.',
      includes: [
        '6 × bi-weekly 90-minute coaching sessions',
        'Business model and operations audit',
        'Capability statement development',
        'Procurement readiness assessment',
        'Email support between sessions',
        'Kasandy resource toolkit',
      ],
      outcome: 'A clear 90-day action plan, a polished capability statement, and a mapped procurement entry pathway.',
      featured: false,
      requestProposal: false,
      ctaLabel: 'Inquire About Foundation',
      ctaHref: '/contact',
    },
    {
      tier: 'Accelerator',
      subtitle: '6-Month Full Service',
      fromPrice: 'Investment — quoted after Discovery Session',
      description: 'For founders ready to compete for contracts and scale — $200K–$2M revenue range. Full procurement support through to active bid submissions.',
      includes: [
        'Everything in Foundation',
        'Bid and proposal review (up to 3 submissions)',
        'Certification readiness roadmap (CAMSC, CCAB, WBE, etc.)',
        'Marketing and brand positioning session',
        'Fundraising and grant strategy session',
        'Buyer introduction support (where applicable)',
        'Monthly progress report',
      ],
      outcome: 'Active procurement submissions, certification application in progress, and at least one qualified buyer introduction.',
      featured: true,
      requestProposal: false,
      ctaLabel: 'Inquire About Accelerator',
      ctaHref: '/contact',
    },
    {
      tier: 'Partner',
      subtitle: 'Annual Advisory Retainer',
      fromPrice: 'Custom proposal',
      description: 'For founders who want Jackee in their corner year-round — growth and scale stage. Ongoing strategic advisory with priority access.',
      includes: [
        'Everything in Accelerator',
        'Monthly advisory retainer (ongoing strategic support)',
        'Fractional COO / strategic advisor services',
        'Priority bid and proposal turnaround',
        'Speaking and pitch preparation support',
        'VIP access to all Kasandy programs and events',
      ],
      outcome: 'A sustained competitive advantage in procurement — with a senior strategic partner permanently on your side.',
      featured: false,
      requestProposal: true,
      ctaLabel: 'Request a Proposal',
      ctaHref: '/contact',
    },
  ],
  nonprofits: [
    {
      tier: 'Clarity',
      subtitle: '60-Day Strategic Diagnosis',
      fromPrice: 'Investment — quoted after strategy call',
      description: 'For non-profits at a crossroads — scaling, restructuring, or facing sustainability pressure. Gets you clear in 60 days.',
      includes: [
        'Full organisational diagnostic (financials, governance, programming)',
        'Executive director assessment and 1:1 coaching (4 sessions)',
        'Board governance review',
        'Written strategic diagnosis report',
        'Priority roadmap with 12-month milestones',
      ],
      outcome: 'A clear picture of where your organisation actually stands — and a prioritised roadmap for what to do first.',
      featured: false,
      requestProposal: false,
      ctaLabel: 'Inquire About Clarity',
      ctaHref: '/contact',
    },
    {
      tier: 'Transformation',
      subtitle: '6-Month Program',
      fromPrice: 'Investment — quoted after strategy call',
      description: 'For non-profits committed to deep, lasting change in how they operate, fundraise, and grow. Full-service strategic support.',
      includes: [
        'Everything in Clarity',
        '3-day strategic planning retreat facilitation',
        'Board training and governance restructuring',
        'Fundraising strategy and funder diversification plan',
        'Grant narrative review and development support',
        'ED coaching (bi-weekly sessions throughout)',
      ],
      outcome: 'A restructured organisation with a functioning board, a diversified funder strategy, and leadership that operates with confidence.',
      featured: true,
      requestProposal: false,
      ctaLabel: 'Inquire About Transformation',
      ctaHref: '/contact',
    },
    {
      tier: 'Centre of Excellence',
      subtitle: 'Annual Partnership',
      fromPrice: 'Custom engagement',
      description: 'For non-profits that want Kasandy Consulting as their permanent strategic partner — year-round advisory and capacity building.',
      includes: [
        'Everything in Transformation',
        'Annual strategic review retreat facilitation',
        'Board training and governance facilitation (quarterly)',
        'Ongoing grant strategy and narrative support',
        'Staff capacity building workshops (up to 4 per year)',
        'ED executive coaching (monthly)',
        'Access to full Kasandy resource and template library',
      ],
      outcome: 'A high-functioning organisation that consistently attracts funding, retains strong leadership, and scales its impact year over year.',
      featured: false,
      requestProposal: true,
      ctaLabel: 'Request a Proposal',
      ctaHref: '/contact',
    },
  ],
  government: [
    {
      tier: 'Advisory',
      subtitle: 'Strategic Procurement Consulting',
      fromPrice: 'Project-based or retainer',
      description: 'For government teams that need an experienced partner to design and implement inclusive procurement strategy from the ground up.',
      includes: [
        'Supplier diversity audit and gap analysis',
        'Inclusive procurement policy and program co-design',
        'Stakeholder facilitation sessions (government + community)',
        'Written strategy report with implementation roadmap',
        'Buyer-facing supplier diversity toolkit',
      ],
      ideal: 'Federal, provincial, and municipal procurement teams | Crown corporations | Economic development agencies',
      featured: false,
      requestProposal: true,
      ctaLabel: 'Request a Proposal',
      ctaHref: '/contact',
    },
    {
      tier: 'Training',
      subtitle: 'Procurement Readiness Program Delivery',
      fromPrice: 'Per cohort or multi-cohort contract',
      description: 'Culturally grounded, outcomes-focused procurement training for diverse and Indigenous supplier communities. Delivered virtually or in-person.',
      includes: [
        'Customised curriculum for your supplier community',
        'Indigenous procurement training (ISET-aligned, culturally grounded)',
        'Supplier readiness modules: capability statements, RFP response, certification',
        'Virtual and in-person delivery options',
        'Post-program outcome report for funders and evaluators',
      ],
      ideal: 'ISET partners | Indigenous Economic Development organisations | EDOs | Crown corporations with supplier diversity mandates',
      featured: true,
      requestProposal: true,
      ctaLabel: 'Request a Proposal',
      ctaHref: '/contact',
    },
    {
      tier: 'Retainer',
      subtitle: 'Ongoing Procurement Inclusion Advisory',
      fromPrice: 'Monthly retainer | multi-year partnership',
      description: 'Embedded, ongoing advisory for departments and agencies with sustained supplier diversity mandates. Program evaluation, reporting, and continuous improvement.',
      includes: [
        'Embedded advisory support for procurement team',
        'Program evaluation, reporting, and continuous improvement',
        'Stakeholder liaison: community, industry, government',
        'Annual curriculum review and update',
        'Government funder reporting and compliance support',
      ],
      ideal: 'Large departments and agencies with sustained supplier diversity mandates | Multi-year funded programs',
      featured: false,
      requestProposal: true,
      ctaLabel: 'Request a Proposal',
      ctaHref: '/contact',
    },
  ],
}

const audienceKey: Record<Audience, keyof ProgramsData> = {
  'Entrepreneurs': 'entrepreneurs',
  'Non-Profits': 'nonprofits',
  'Government': 'government',
}

const inputCls = 'w-full text-sm border border-gray-200 px-3 py-2 focus:outline-none focus:border-gray-400'
const btnPrimary = 'text-xs bg-gray-900 text-white px-3 py-1.5 hover:bg-gray-700 transition-colors'

export default function AdminPrograms() {
  const [tab, setTab] = useState<Audience>('Entrepreneurs')
  const [programs, setPrograms] = useState<ProgramsData>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [usingDefaults, setUsingDefaults] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/admin/programs')
    const d = await r.json()
    if (!d || (!d.entrepreneurs && !d.nonprofits && !d.government)) {
      setPrograms(DEFAULTS)
      setUsingDefaults(true)
    } else {
      setPrograms({
        entrepreneurs: d.entrepreneurs ?? DEFAULTS.entrepreneurs,
        nonprofits: d.nonprofits ?? DEFAULTS.nonprofits,
        government: d.government ?? DEFAULTS.government,
      })
      setUsingDefaults(false)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function saveAudience() {
    setSaving(true)
    await fetch('/api/admin/programs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(programs),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setUsingDefaults(false)
  }

  function updateProgram(idx: number, updated: Program) {
    const key = audienceKey[tab]
    setPrograms(prev => ({
      ...prev,
      [key]: prev[key].map((p, i) => i === idx ? updated : p),
    }))
  }

  const currentPrograms = programs[audienceKey[tab]]

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
        <h1 className="text-base font-semibold text-gray-900">Programs & Pricing</h1>
      </header>
      <p className="text-xs text-gray-400 p-10">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Programs & Pricing</h1>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-green-600">Saved!</span>}
          <button onClick={saveAudience} disabled={saving} className={btnPrimary}>
            {saving ? 'Saving…' : `Save ${tab} Programs`}
          </button>
        </div>
      </header>

      {usingDefaults && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <p className="text-xs text-amber-700">Currently using default content — edit below to override and save to KV storage.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6">
          {AUDIENCES.map(a => (
            <button key={a} onClick={() => setTab(a)}
              className={`text-sm py-3 border-b-2 transition-colors ${tab === a ? 'border-gray-900 text-gray-900 font-medium' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {currentPrograms.map((program, idx) => (
          <div key={idx} className="bg-white border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-gray-900">Card {idx + 1}</h2>
              {program.featured && (
                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5">Featured</span>
              )}
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tier (e.g. Foundation)</label>
                <input className={inputCls} value={program.tier}
                  onChange={e => updateProgram(idx, { ...program, tier: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Subtitle</label>
                <input className={inputCls} value={program.subtitle}
                  onChange={e => updateProgram(idx, { ...program, subtitle: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Investment label</label>
                <input className={inputCls} value={program.fromPrice}
                  onChange={e => updateProgram(idx, { ...program, fromPrice: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Description</label>
              <textarea rows={3} className={inputCls} value={program.description}
                onChange={e => updateProgram(idx, { ...program, description: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Includes (one item per line — each line becomes a bullet point)</label>
              <textarea rows={6} className={inputCls}
                value={(program.includes ?? []).join('\n')}
                onChange={e => updateProgram(idx, { ...program, includes: e.target.value.split('\n') })} />
            </div>

            {tab !== 'Government' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Outcome (optional)</label>
                <textarea rows={2} className={inputCls} value={program.outcome ?? ''}
                  onChange={e => updateProgram(idx, { ...program, outcome: e.target.value })} />
              </div>
            )}

            {tab === 'Government' && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ideal for (optional)</label>
                <input className={inputCls} value={program.ideal ?? ''}
                  onChange={e => updateProgram(idx, { ...program, ideal: e.target.value })} />
              </div>
            )}

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={program.featured ?? false}
                  onChange={e => updateProgram(idx, { ...program, featured: e.target.checked })} />
                Featured card
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={program.requestProposal ?? false}
                  onChange={e => updateProgram(idx, { ...program, requestProposal: e.target.checked })} />
                Request Proposal CTA
              </label>
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
