export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { articles } from '@/data/articles'
import LeadMagnetCard from './LeadMagnetCard'
import NewsletterSignup from './NewsletterSignup'

export const metadata: Metadata = {
  title: 'Free Resources & Insights | Kasandy Consulting',
  description: 'Free procurement checklists, capability statement guides, non-profit scorecards, and market entry roadmaps. Plus insights from Jackee Kasandy on procurement, leadership, and growth.',
}

const leadMagnets = [
  {
    id: 'procurement-checklist',
    title: 'The Canadian Procurement Readiness Checklist',
    description: 'Are you actually ready to submit a bid? This checklist covers every element Canadian buyers check before reading a proposal — from company registration to capability statements to insurance.',
    format: 'PDF, 2 pages',
    category: 'Procurement',
  },
  {
    id: 'capability-statement',
    title: 'How to Write a Capability Statement — Step-by-Step Guide',
    description: "A capability statement is often the first thing a buyer reads. This guide walks through every section, what buyers are looking for, and the most common mistakes that get suppliers disqualified before a conversation starts. Includes a template.",
    format: 'PDF, 6 pages + template',
    category: 'Procurement',
  },
  {
    id: 'nonprofit-scorecard',
    title: 'The Non-Profit Sustainability Scorecard',
    description: 'Rate your organisation across six dimensions of sustainability — revenue diversification, governance, leadership, programming, community, and communications. Know where you stand before a funding crisis forces the question.',
    format: 'PDF, 4 pages',
    category: 'Non-Profit',
  },
  {
    id: 'kenya-canada-roadmap',
    title: 'Kenya to Canada — Your Market Entry Roadmap',
    description: "The honest guide. What's required, what disqualifies applicants early, what timelines actually look like, and the 8 steps to building a credible Canadian supplier profile from outside the country.",
    format: 'PDF, 8 pages',
    category: 'International',
  },
]

const categoryColors: Record<string, string> = {
  Procurement: 'bg-kc-brown/10 text-kc-brown',
  'Non-Profit Leadership': 'bg-kc-black/10 text-kc-black',
  International: 'bg-kc-gray-border text-kc-gray-mid',
  Advocacy: 'bg-kc-red/10 text-kc-red',
}

export default function Resources() {
  const publishedArticles = articles.filter(a => a.published)
  const draftArticles = articles.filter(a => !a.published)
  const displayArticles = publishedArticles.length > 0 ? publishedArticles : draftArticles

  return (
    <div className="pt-16">

      {/* Hero */}
      <section className="py-28 px-6 bg-kc-gray-light border-b border-kc-gray-border">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Resources & Insights</span>
          <h1 className="font-display text-6xl md:text-7xl font-light text-kc-black leading-tight mb-6">
            Knowledge that moves you forward.
          </h1>
          <p className="font-sans text-base text-kc-gray-mid max-w-2xl leading-relaxed">
            Free tools, guides, and insights drawn from 3,000+ entrepreneurs trained and years of frontline consulting work. Take what's useful.
          </p>
        </div>
      </section>

      {/* Lead Magnets */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Free Downloads</span>
          <h2 className="section-heading mb-4">Practical Guides & Toolkits</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-14 max-w-xl">Enter your email to download. You'll receive the guide directly to your inbox along with occasional insights from Kasandy Consulting.</p>
          <div className="grid sm:grid-cols-2 gap-6">
            {leadMagnets.map(lm => (
              <LeadMagnetCard key={lm.id} {...lm} />
            ))}
          </div>
        </div>
      </section>

      {/* Blog / Insights */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Insights</span>
          <h2 className="section-heading mb-4">The Kasandy Brief</h2>
          <p className="font-sans text-sm text-kc-gray-mid mb-14 max-w-xl">Straight-talk on procurement, supplier diversity, non-profit leadership, and entrepreneurship. No filler.</p>
          {publishedArticles.length === 0 && (
            <div className="mb-8 border border-dashed border-kc-gray-border bg-white px-6 py-4 inline-flex items-center gap-3">
              <span className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid">Articles coming soon — publishing via Admin</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {displayArticles.map(a => (
              <div key={a.id} className="card group">
                <div className="flex items-center justify-between mb-4">
                  <span className={`font-sans text-[10px] tracking-widest uppercase px-2 py-1 ${categoryColors[a.category] || 'bg-kc-gray-light text-kc-gray-mid'}`}>
                    {a.category}
                  </span>
                  {!a.published && (
                    <span className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid">Draft</span>
                  )}
                </div>
                <h3 className="font-display text-xl font-light leading-snug mb-3 group-hover:text-kc-brown transition-colors">{a.title}</h3>
                <p className="font-sans text-xs text-kc-gray-mid leading-relaxed mb-6">{a.excerpt}</p>
                <div className="flex items-center justify-between">
                  <span className="font-sans text-[10px] text-kc-gray-mid">{new Date(a.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  {a.published ? (
                    <span className="font-sans text-xs tracking-wide text-kc-brown group-hover:underline cursor-pointer">Read More →</span>
                  ) : (
                    <span className="font-sans text-xs text-kc-gray-mid">Coming Soon</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 px-6 bg-kc-black text-white">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="section-label text-kc-brown">Newsletter</span>
            <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-6">The Kasandy Brief</h2>
            <p className="font-sans text-sm text-white/60 leading-relaxed">
              Procurement strategy, supplier diversity insights, and honest counsel on entrepreneurship and leadership. Sent when there's something worth saying.
            </p>
          </div>
          <div>
            <NewsletterSignup />
          </div>
        </div>
      </section>

    </div>
  )
}
