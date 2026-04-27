import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Non-Profit Strategy, Fundraising & Leadership Coaching | Kasandy Consulting',
  description: 'Strategic planning, fundraising strategy, ED coaching, and sustainability models for mission-driven organisations. Build the business model your mission deserves.',
}

const qualifiers = [
  "You have strong programs and a clear mission — but your organisation's financial model is fragile.",
  "You're an Executive Director or founder who is stretched thin and making strategic decisions in the gaps between everything else.",
  "Your board is active but not yet functioning as the governance asset it should be.",
  "You're applying for the same grants every year and not sure how to break the cycle.",
  "Your team is growing but your systems, HR practices, and leadership structure haven't kept up.",
  "You want a strategic partner who has worked in both the non-profit and for-profit worlds — and who won't give you advice that sounds good but doesn't hold up in practice.",
]

const faqs = [
  {
    q: 'Our budget is small. Can we still work with you?',
    a: 'We offer different program tiers at different investment levels — and many non-profits qualify for subsidised or funded coaching. Tell us your situation honestly in the strategy call and we will tell you honestly what options exist.',
  },
  {
    q: 'Can you help us write a specific grant application?',
    a: 'Grant narrative support is included in our Transformation and Centre of Excellence programs. For standalone grant writing support, contact us to discuss scope — this is case-by-case depending on timeline and fit.',
  },
  {
    q: 'We have a difficult board situation. Is that something you work with?',
    a: 'Yes. Board governance challenges — including dysfunctional dynamics, role confusion, and succession gaps — are among the most common issues we encounter. We facilitate board sessions with care, candour, and a clear framework for resolution.',
  },
  {
    q: 'How is this different from other non-profit consultants?',
    a: 'Most non-profit consultants have sector experience without business experience, or business experience without sector credibility. We have both. We also bring direct, honest counsel — not a framework exercise that produces a report and no follow-through.',
  },
]

export default function Nonprofits() {
  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden bg-kc-warm-white" style={{ minHeight: '88vh' }}>
        {/* Photo right */}
        <div className="absolute right-0 top-0 w-[42%] h-full z-[1] overflow-hidden">
          <div className="absolute inset-0 z-10 pointer-events-none"
            style={{ background: 'linear-gradient(90deg,#FDFCFA 0%,transparent 28%)' }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero-nonprofits.jpg" alt=""
            className="w-full h-full object-cover object-top" />
        </div>

        {/* Left copy */}
        <div className="relative z-[2] px-8 lg:px-20 py-24 max-w-[600px]">
          <div className="flex items-center gap-3 mb-5">
            <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">For Non-Profit Organizations</span>
          </div>

          <h1 className="font-display font-bold text-kc-charcoal leading-[1.08] mb-6 tracking-[-0.01em]"
            style={{ fontSize: 'clamp(40px,4.5vw,64px)' }}>
            Your mission is powerful.<br />Your business model<br />needs to{' '}
            <em className="italic text-kc-brown">match.</em>
          </h1>

          <p className="font-sans text-[17px] leading-[1.7] text-kc-text-mid max-w-[480px] mb-9">
            Strategic planning, fundraising strategy, leadership coaching, and sustainability models for mission-driven organisations ready to stop surviving and start thriving.
          </p>

          {/* Quote card */}
          <div className="mb-8 px-7 py-6 bg-white border-l-4 border-kc-brown max-w-[460px]"
            style={{ boxShadow: '0 2px 20px rgba(113,47,30,.08)' }}>
            <p className="font-display italic text-[18px] text-kc-charcoal leading-[1.55]">
              "The business model your mission deserves — not just the one grant cycles allow."
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/contact" className="btn-brown">Book a Consultation</Link>
            <Link href="/services" className="btn-outline">See Our Programs</Link>
          </div>
        </div>
      </section>

      {/* Qualification + Context */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
          <div>
            <span className="section-label">Is This For You?</span>
            <h2 className="section-heading mb-12">You're in the right place if…</h2>
            <div className="space-y-5">
              {qualifiers.map((q) => (
                <div key={q} className="flex items-start gap-4">
                  <span className="text-kc-brown shrink-0 font-display text-xl">→</span>
                  <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-kc-gray-light p-10 border border-kc-gray-border">
            <span className="section-label">Our Approach</span>
            <h2 className="font-display text-3xl font-light mb-6">We know this sector from the inside.</h2>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-5">
              Jackee Kasandy has coached hundreds of Executive Directors, founders, and board leaders of non-profits across Canada. She has led funding strategy workshops for grassroots organisations and knows the specific pressures of mission-driven leadership: the board dynamics, the funder relationships, the staff retention challenges, and the very real risk of founder burnout.
            </p>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">
              Kasandy Consulting does not bring a for-profit consulting model and dress it up in sector language. We bring genuine sector understanding — and the additional advantage of deep experience in the business world, which gives us a clear lens on sustainability, revenue diversification, and operational efficiency that many non-profit consultants lack.
            </p>
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Programs</span>
          <h2 className="section-heading mb-16">Non-Profit Programs</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tier: 'Clarity',
                subtitle: '60-Day Strategic Diagnosis',
                for: 'Non-profits at a crossroads — scaling, restructuring, or facing sustainability pressure',
                includes: [
                  'Organisational assessment (programs, finances, governance, team)',
                  '3-year strategic plan co-development (with ED and board input)',
                  'Revenue diversification roadmap',
                  'One board governance session',
                  'Written strategy document + executive summary for funders',
                ],
                outcome: 'A clear-eyed picture of where you are, where you need to go, and what it will take — with a plan you can actually execute.',
              },
              {
                tier: 'Transformation',
                subtitle: '6-Month Program',
                for: 'Non-profits committed to deep, lasting change in how they operate and grow',
                includes: [
                  'Everything in Clarity',
                  'Fundraising strategy and funder mapping (earned revenue + grants + partnerships)',
                  'Grant narrative support (up to 2 applications)',
                  'ED leadership coaching (bi-weekly sessions)',
                  'Brand and communications strategy',
                  'Impact measurement framework design',
                  'Staff capacity building workshop (1 session)',
                ],
                outcome: 'An organisation that is financially diversified, leadership-strong, and positioned to grow — with the documents and frameworks to show funders you mean it.',
                featured: true,
              },
              {
                tier: 'Centre of Excellence',
                subtitle: 'Annual Partnership',
                for: 'Non-profits that want Kasandy Consulting as their permanent strategic partner',
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
              },
            ].map((p) => (
              <div key={p.tier} className={`bg-white p-8 border ${p.featured ? 'border-kc-brown' : 'border-kc-gray-border'}`}>
                {p.featured && <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Most Popular</p>}
                <h3 className="font-display text-2xl font-light mb-1">{p.tier}</h3>
                <p className="font-sans text-xs text-kc-gray-mid mb-5">{p.subtitle}</p>
                <p className="font-sans text-[11px] text-kc-black mb-4"><strong>For:</strong> {p.for}</p>
                <ul className="space-y-1.5 mb-6">
                  {p.includes.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-kc-brown shrink-0 text-xs">—</span>
                      <span className="font-sans text-xs text-kc-gray-mid leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-kc-gray-border pt-4 mb-6">
                  <p className="font-sans text-xs text-kc-black italic leading-relaxed">{p.outcome}</p>
                </div>
                <Link href="/contact" className={p.featured ? 'btn-brown w-full justify-center' : 'btn-outline w-full justify-center'}>
                  Book a Consultation
                </Link>
              </div>
            ))}
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
            <Link href="/contact" className="btn-primary">Book a Consultation</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
