import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Canadian Market Entry & Procurement Bootcamps for Kenyan Entrepreneurs | Kasandy Consulting',
  description: 'Prepare to compete in Canadian procurement markets. Bootcamps in Nairobi, market entry strategy, certification support, and buyer introductions for Kenyan and international businesses.',
}

const seminarTopics = [
  'How Canadian procurement works — federal, provincial, and corporate',
  'The certification landscape: CAMSC, CCAB, WBE, BEBC Society, and others',
  'How to respond to Requests for Proposals (RFPs) and tenders',
  'How to write a capability statement that Canadian buyers respect',
  'What makes a supplier credible to Canadian buyers — and what disqualifies them',
  'The role of financial systems, banking, and trade finance in export success',
  'How to build relationships in the Canadian market — diaspora networks, trade bodies, industry associations',
]

const qualifiers = [
  'You run a business in Kenya with products or services that could serve Canadian corporations or government — in sectors like agribusiness, textiles, ICT, professional services, manufacturing, or hospitality.',
  "You've heard about the Canadian market but don't know where to start or who to approach.",
  'You want to understand what Canadian buyers actually look for — and what disqualifies a supplier before the bid is even read.',
  "You're connected to the Kenyan-Canadian diaspora community and are looking for a structured path to market.",
  'You attended one of our Kenya-Canada Procurement Readiness Seminars and want to take the next step.',
]

const faqs = [
  {
    q: 'My business is in Kenya. Can I work with Canadian corporations remotely?',
    a: 'Many Canadian procurement contracts are open to international suppliers, particularly in services, technology, and specialised sectors. The key requirements are a credible track record, compliance documentation, and in some cases a Canadian registered entity or partnership. We walk you through all of this in the program.',
  },
  {
    q: 'What sectors have the best opportunity for Kenyan businesses in Canada?',
    a: 'Agribusiness and food products, textiles and apparel, ICT and software services, professional services (legal, accounting, HR), construction and engineering services, and hospitality and tourism. We tailor coaching to your specific sector.',
  },
  {
    q: 'Do I need to be in Canada to attend the program?',
    a: 'The bootcamp is held in Nairobi (or virtually). The follow-on coaching is fully virtual. The 6-month Market Entry program includes virtual sessions with periodic in-person options during Canadian trade visits or diaspora events.',
  },
  {
    q: 'Are there Kenyan or East African financial partners involved in the seminar?',
    a: 'We actively seek banking and financial institution sponsors for each seminar — including institutions that provide trade finance, export financing, and tender guarantee products. Contact us about the current partner roster for the next event.',
  },
]

export default function Kenya() {
  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden" style={{ minHeight: '92vh' }}>
        {/* Full-bleed photo with sepia/warm treatment */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-kenya.jpg" alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_20%]"
          style={{ filter: 'sepia(20%) brightness(0.88)' }} />
        {/* Warm overlay from upper-left */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg,rgba(253,252,250,.97) 0%,rgba(253,252,250,.75) 45%,rgba(240,220,180,.25) 100%)' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-20 py-28 grid md:grid-cols-[1fr_380px] gap-16 md:gap-20 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-7 h-px bg-kc-gold flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-gold">For Kenyan &amp; International Entrepreneurs</span>
            </div>

            <h1 className="font-display font-bold text-kc-charcoal leading-[1.04] mb-7 tracking-[-0.01em]"
              style={{ fontSize: 'clamp(44px,5.2vw,70px)' }}>
              Canada's procurement<br />market is open.<br />
              <em className="italic text-kc-gold">Walk in.</em>
            </h1>

            <p className="font-sans text-[17px] leading-[1.7] text-kc-text-mid max-w-[480px] mb-9">
              Bootcamps, market entry strategy, and network connections for Kenyan entrepreneurs ready to compete for Canadian government and corporate contracts.
            </p>

            {/* Bridge device */}
            <div className="flex items-center gap-4 py-4 border-y border-kc-linen mb-8">
              <div className="flex flex-col gap-1">
                <span className="text-[28px]">🇰🇪</span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-kc-text-lt uppercase">Kenya</span>
              </div>
              <div className="flex-1 text-center text-kc-gold text-xl">⟶</div>
              <div className="flex flex-col gap-1">
                <span className="text-[28px]">🇨🇦</span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-kc-text-lt uppercase">Canada</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/contact" className="inline-flex items-center px-7 py-3.5 text-white text-xs tracking-widest uppercase font-sans font-bold transition-colors"
                style={{ background: '#B8922A' }}>Register for the Next Bootcamp</Link>
              <Link href="/contact" className="btn-outline">Book a Market Entry Call</Link>
            </div>
          </div>

          {/* Right: stats panel */}
          <div className="hidden md:flex flex-col gap-7 bg-white border border-kc-linen p-10"
            style={{ boxShadow: '0 4px 32px rgba(113,47,30,.08)' }}>
            {[
              { val: '$1T+', desc: 'Annual Canadian government and corporate procurement spend' },
              { val: '3,000+', desc: 'Entrepreneurs trained through Kasandy\'s procurement programs' },
              { val: '17–21', desc: 'Businesses secured contracts including multi-million-dollar deals' },
            ].map((s, i) => (
              <div key={i}>
                <div className="font-display font-bold text-kc-gold leading-none" style={{ fontSize: '44px' }}>
                  {s.val}
                </div>
                <p className="font-sans text-[12px] text-kc-text-lt mt-1.5 leading-[1.5]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Opportunity */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div>
            <span className="section-label">The Opportunity</span>
            <h2 className="section-heading mb-8">Why Canada. Why now.</h2>
            <div className="space-y-4 font-sans text-sm text-kc-gray-mid leading-relaxed">
              <p>The Canadian government and its largest corporations spend hundreds of billions of dollars annually through procurement — and both are actively seeking to diversify their supply chains. There are formal set-aside programs for underrepresented businesses. There are certification pathways specifically designed for international and minority-owned suppliers. There is a large, well-connected Kenyan-Canadian diaspora community with direct relationships with Canadian buyers.</p>
              <p>Most Kenyan businesses with the capability to compete for Canadian contracts never do — not because they're not qualified, but because they don't know the system, the language of procurement, the certifications that open doors, or who to call.</p>
              <p className="font-display text-xl italic text-kc-black">That's the gap Kasandy Consulting closes.</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-kc-brown text-white p-8">
              <p className="font-display text-5xl font-light mb-2">$39B+</p>
              <p className="font-sans text-sm text-white/80">Worth of contracts accessible to new international suppliers in Canada's procurement market</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-kc-gray-light border border-kc-gray-border p-6">
                <p className="font-display text-3xl font-light text-kc-brown mb-2">3,000+</p>
                <p className="font-sans text-xs text-kc-gray-mid">Entrepreneurs trained through BEBC Society programs</p>
              </div>
              <div className="bg-kc-gray-light border border-kc-gray-border p-6">
                <p className="font-display text-3xl font-light text-kc-brown mb-2">17–21</p>
                <p className="font-sans text-xs text-kc-gray-mid">Businesses that secured procurement contracts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Kenya Seminar */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Signature Event</span>
          <h2 className="section-heading mb-3">The Kenya–Canada Procurement Readiness Seminar</h2>
          <p className="font-display text-xl italic text-kc-gray-mid mb-12">Canada's procurement system, explained — for Kenyan businesses.</p>

          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div>
              <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-8">
                Our signature two-day event in Nairobi prepares Kenyan entrepreneurs to understand and compete in Canadian corporate and government procurement markets. Based on the highly regarded BEBC Supplier Diversity & Procurement Readiness Program — which has trained hundreds of businesses across Canada — the seminar is tailored specifically for the Kenyan business context.
              </p>
              <h3 className="font-display text-2xl font-light mb-6">What Participants Learn</h3>
              <div className="space-y-3">
                {seminarTopics.map((t) => (
                  <div key={t} className="flex items-start gap-3">
                    <span className="text-kc-brown shrink-0">→</span>
                    <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/contact?ref=kenya-seminar" className="btn-primary">Register for the Next Seminar</Link>
                <Link href="/contact?ref=seminar-overview" className="btn-outline">Download the Seminar Overview</Link>
              </div>
            </div>

            {/* Seminar Ad Images */}
            <div className="space-y-4">
              <div className="relative aspect-[3/4] border border-kc-gray-border overflow-hidden">
                <Image src="/images/kenya-seminar-1.png" alt="Kenya-Canada Procurement Readiness Seminar"
                  fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Qualification */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Is This For You?</span>
          <h2 className="section-heading mb-12">This program is for you if…</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {qualifiers.map((q) => (
              <div key={q} className="flex items-start gap-4 border border-kc-gray-border p-6 bg-kc-gray-light">
                <span className="text-kc-brown shrink-0 font-display text-xl">→</span>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Programs</span>
          <h2 className="section-heading mb-4">Beyond the Seminar — Your Market Entry Path</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {[
              {
                tier: 'Bootcamp',
                subtitle: '2-Day Seminar',
                format: 'In-person (Nairobi) or virtual',
                items: [
                  'Full-day procurement landscape session (Day 1)',
                  'Practical workshops: capability statements, RFP response, certification (Day 2)',
                  'Networking session with diaspora connectors and Canadian-market contacts',
                  'Participant resource kit: templates, checklists, certification guides',
                  'Certificate of Completion',
                ],
                best: 'Kenyan entrepreneurs at the exploration or early preparation stage',
              },
              {
                tier: 'Accelerate',
                subtitle: '90-Day Follow-On Coaching',
                format: 'Virtual coaching sessions (5 × 60-minute)',
                items: [
                  'Capability statement refinement and review',
                  'Buyer targeting strategy for your specific sector',
                  'First RFP response support and review',
                  'Introductions to 2–3 Canadian buyers or network contacts (where applicable)',
                  'Email support between sessions',
                ],
                best: 'Seminar graduates ready to take concrete steps toward Canadian market entry',
                featured: true,
              },
              {
                tier: 'Market Entry',
                subtitle: '6-Month Full Program',
                format: 'Bi-weekly virtual sessions + on-demand support',
                items: [
                  'Full capability statement and pitch deck for Canadian buyers',
                  'Certification application support (Canadian certifying bodies)',
                  'Sector-specific buyer targeting and outreach strategy',
                  'Introductions to Canadian buyers, distributors, and diaspora connectors',
                  'Deal facilitation support for first Canadian commercial engagement',
                  'Monthly progress review',
                ],
                best: 'Kenyan businesses serious about entering the Canadian market within 12 months',
              },
            ].map((p) => (
              <div key={p.tier} className={`bg-white p-8 border ${p.featured ? 'border-kc-brown' : 'border-kc-gray-border'}`}>
                {p.featured && <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Recommended Next Step</p>}
                <h3 className="font-display text-2xl font-light mb-1">{p.tier}</h3>
                <p className="font-sans text-xs text-kc-gray-mid mb-1">{p.subtitle}</p>
                <p className="font-sans text-[11px] text-kc-brown mb-5">{p.format}</p>
                <ul className="space-y-1.5 mb-6">
                  {p.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-kc-brown shrink-0 text-xs">—</span>
                      <span className="font-sans text-xs text-kc-gray-mid leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-kc-gray-border pt-4 mb-6">
                  <p className="font-sans text-[10px] uppercase tracking-wide text-kc-gray-mid mb-1">Best for</p>
                  <p className="font-sans text-xs text-kc-black italic">{p.best}</p>
                </div>
                <Link href="/contact" className={p.featured ? 'btn-brown w-full justify-center' : 'btn-outline w-full justify-center'}>
                  Register / Inquire
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sponsorship */}
      <section className="py-20 px-6 bg-kc-black text-white">
        <div className="max-w-7xl mx-auto">
          <span className="section-label text-kc-brown">Partnerships</span>
          <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-6">Sponsor the Kenya–Canada Seminar</h2>
          <p className="font-sans text-sm text-white/60 max-w-2xl leading-relaxed mb-16">
            Canadian financial institutions, insurance providers, trade organisations, and corporations looking to build supplier pipelines from Kenya and across East Africa can partner with Kasandy Consulting as seminar sponsors.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tier: 'Gold Sponsor',
                price: 'KSH 500,000+',
                label: 'Presenting Sponsor',
                items: ['Co-branding on all event materials', '10-minute speaking slot', 'Exhibitor table', '30 complimentary registrations', 'Post-event outcomes report', 'Featured in Kasandy newsletter (Canada reach)'],
              },
              {
                tier: 'Silver Sponsor',
                price: 'KSH 200,000+',
                label: 'Category Sponsor',
                items: ['Logo on all event materials', '5-minute speaking slot or product table', '10 complimentary registrations', 'Feature in event social media'],
                featured: true,
              },
              {
                tier: 'Bronze Sponsor',
                price: 'KSH 75,000+',
                label: 'Community Sponsor',
                items: ['Logo on event programme', '3 complimentary registrations', 'Mention in opening remarks'],
              },
            ].map((s) => (
              <div key={s.tier} className={`p-8 border ${s.featured ? 'border-kc-brown bg-kc-brown/10' : 'border-white/10'}`}>
                {s.featured && <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Most Popular</p>}
                <h3 className="font-display text-2xl font-light text-white mb-1">{s.tier}</h3>
                <p className="font-sans text-xs text-kc-brown mb-1">{s.label}</p>
                <p className="font-display text-3xl font-light text-white mb-6">{s.price}</p>
                <ul className="space-y-2">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-kc-brown shrink-0 text-xs">—</span>
                      <span className="font-sans text-xs text-white/60 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link href="/contact?ref=sponsorship" className="btn-brown">Enquire About Sponsorship</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <span className="section-label">FAQ</span>
          <h2 className="section-heading mb-12">Common Questions</h2>
          <div className="space-y-8">
            {faqs.map((f) => (
              <div key={f.q} className="border-b border-kc-gray-border pb-8">
                <h3 className="font-display text-xl font-light mb-3">{f.q}</h3>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link href="/contact?ref=kenya-bootcamp" className="btn-primary">Register for the Next Bootcamp</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
