import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'


export const metadata: Metadata = {
  title: 'Consulting Services',
  description: 'Business coaching, procurement strategy, non-profit transformation, and international market entry. Full-service consulting for entrepreneurs, governments, non-profits, and Kenyan businesses.',
  openGraph: { images: [{ url: '/images/hero-services.jpg', width: 1200, height: 630 }] },
}

const services = [
  {
    number: '01',
    title: 'Entrepreneurs & Founders',
    tagline: 'Full-service business coaching, procurement readiness, and growth strategy for founders who are serious about the next level.',
    items: [
      'Business strategy & operations coaching',
      'Procurement readiness & certification preparation',
      'Capability statement development',
      'Proposal & bid coaching',
      'Fundraising & grant strategy',
      'Marketing & brand positioning',
      'Fractional COO/strategic advisor services',
    ],
    cta: 'Explore Entrepreneur Services',
    href: '/entrepreneurs',
  },
  {
    number: '02',
    title: 'Government & Public Sector',
    tagline: 'Procurement strategy, supplier diversity program design, and culturally grounded training for government agencies and public sector organisations.',
    items: [
      'Inclusive procurement strategy design',
      'Supplier diversity program development',
      'Indigenous procurement training (ISET partnership)',
      'Facilitation for multi-stakeholder programs',
      'Curriculum design & program delivery',
      'Procurement readiness training for diverse suppliers',
      'Impact reporting & evaluation frameworks',
    ],
    cta: 'Explore Government Services',
    href: '/government',
  },
  {
    number: '03',
    title: 'Non-Profit Organizations',
    tagline: 'Strategic planning, fundraising strategy, leadership coaching, and sustainability models for mission-driven organisations.',
    items: [
      'Strategic planning & program sustainability models',
      'Executive coaching & leadership development',
      'Fundraising strategy & funder mapping',
      'Grant narrative support & RFP development',
      'Board training & governance facilitation',
      'Community engagement & brand storytelling',
      'Digital toolkits & resource design',
    ],
    cta: 'Explore Non-Profit Services',
    href: '/nonprofits',
  },
  {
    number: '04',
    title: 'Kenya & International',
    tagline: 'Procurement education, Canadian market entry strategy, and network connections for international entrepreneurs ready to compete in Canadian markets.',
    items: [
      'Canada Procurement Readiness Bootcamp (2-day intensive)',
      'Market entry strategy & roadmap',
      'Certification readiness support',
      'Capability statement & proposal development',
      'Network introductions to Canadian buyers',
      '90-day & 6-month follow-on coaching programs',
      'Corporate & group cohort programs',
    ],
    cta: 'Explore Kenya & International Services',
    href: '/kenya',
  },
]

const steps = [
  'Book a complimentary 15-minute strategy call. Come with your goals — we\'ll come with questions.',
  'We scope the engagement. A proposal and Statement of Work outlines deliverables, timeline, and investment.',
  'You sign off. We get to work.',
  'Delivery: coaching sessions, program facilitation, strategic documents, or all of the above — depending on what you need.',
  'Reporting & closeout: clear outcomes, what we measured, what comes next.',
]

export default function Services() {
  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden bg-kc-cream" style={{ minHeight: '76vh' }}>
        {/* S watermark */}
        <span className="absolute font-display font-bold text-kc-brown/[0.05] select-none pointer-events-none"
          style={{ fontSize: '500px', right: '-40px', top: '-80px', lineHeight: 1 }}>S</span>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-20 py-24 grid md:grid-cols-2 gap-20 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">Our Services</span>
            </div>

            <h1 className="font-display font-bold text-kc-charcoal leading-[1.06] mb-6 tracking-[-0.01em]"
              style={{ fontSize: 'clamp(42px,4.5vw,66px)' }}>
              Strategy that works<br />in the real world.
            </h1>

            <p className="font-sans text-[16px] leading-[1.74] text-kc-text-mid mb-9">
              Four areas of practice. Every engagement tailored. One standard — honest counsel, clear deliverables, and results you can measure.
            </p>

            <Link href="/contact" className="btn-brown">Work With Us</Link>
          </div>

          {/* Right: 2×2 service cards */}
          <div className="grid grid-cols-2 gap-0.5">
            {[
              { num: '01', name: 'Entrepreneurs\n& Founders', href: '/entrepreneurs' },
              { num: '02', name: 'Government\n& Public Sector', href: '/government' },
              { num: '03', name: 'Non-Profit\nOrganizations', href: '/nonprofits' },
              { num: '04', name: 'Kenya &\nInternational', href: '/kenya' },
            ].map(s => (
              <Link key={s.num} href={s.href}
                className="group bg-kc-charcoal px-7 py-8 hover:bg-kc-brown transition-colors block">
                <div className="font-mono text-[10px] text-[#555] tracking-[0.12em] mb-3">{s.num}</div>
                <div className="font-display text-[19px] font-semibold text-white leading-[1.25] mb-3.5">
                  {s.name.split('\n').map((line, i) => <span key={i}>{line}{i === 0 && <br />}</span>)}
                </div>
                <div className="text-kc-brown text-xl group-hover:text-white/50 transition-colors">→</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Four Service Areas */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-0">
          {services.map((s, i) => (
            <div key={s.number} className={`py-16 ${i < services.length - 1 ? 'border-b border-kc-gray-border' : ''}`}>
              <div className="grid md:grid-cols-3 gap-12">
                <div>
                  <p className="font-sans text-[11px] tracking-widest text-kc-brown mb-3">{s.number}</p>
                  <h2 className="font-display text-3xl md:text-4xl font-light mb-4">{s.title}</h2>
                  <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-8">{s.tagline}</p>
                  <Link href={s.href} className="btn-outline">
                    {s.cta} <ArrowRight size={12} className="ml-2" />
                  </Link>
                </div>
                <div className="md:col-span-2">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {s.items.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="text-kc-brown shrink-0 mt-0.5">—</span>
                        <p className="font-sans text-sm text-kc-gray-mid">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How We Work */}
      <section className="py-20 px-6 bg-kc-black text-white">
        <div className="max-w-7xl mx-auto">
          <span className="section-label text-kc-brown">Process</span>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-16">How an Engagement Works</h2>
          <div className="grid md:grid-cols-5 gap-8">
            {steps.map((step, i) => (
              <div key={i}>
                <p className="font-display text-4xl font-light text-kc-brown mb-4">{String(i + 1).padStart(2, '0')}</p>
                <p className="font-sans text-xs text-white/60 leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-16">
            <Link href="/contact" className="btn-brown">Book a Strategy Call</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
