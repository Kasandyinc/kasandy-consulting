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

      {/* Hero */}
      <section className="py-28 px-6 bg-kc-black text-white">
        <div className="max-w-7xl mx-auto">
          <span className="section-label text-kc-brown">For Non-Profit Organizations</span>
          <h1 className="font-display text-5xl md:text-7xl font-light text-white leading-tight mb-8 text-balance">
            Your mission is powerful. Your business model needs to match.
          </h1>
          <p className="font-sans text-base text-white/70 max-w-2xl leading-relaxed mb-12">
            Strategic planning, fundraising strategy, leadership coaching, and sustainability models for mission-driven organisations that are ready to stop surviving and start thriving.
          </p>
          <Link href="/contact" className="btn-brown">Book a Consultation</Link>
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
