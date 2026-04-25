import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'About Kasandy Consulting | Jackee Kasandy, Procurement Strategist & Business Coach',
  description: 'Meet Jackee Kasandy — founder of BEBC Society, BC Housing Commissioner, and creator of Canada\'s first supplier-focused procurement readiness course. Black women-owned consulting firm, Vancouver BC.',
}

const credentials = [
  { label: 'Experience', value: '25+ years: corporate marketing, entrepreneurship, consulting' },
  { label: 'Corporate', value: 'Cossette | Bensimon Byrne | DDB Canada | BC Ferries | WorkSafeBC' },
  { label: 'Entrepreneurship', value: 'Founder & CEO, Kasandy Inc. (est. 2014) | Granville Island, Vancouver' },
  { label: 'Non-Profit', value: 'Founder & Global President, BEBC Society (est. 2020)' },
  { label: 'Boards', value: 'BC Housing Board Commissioner | Board of Directors, Union Gospel Mission' },
  { label: 'Recognition', value: '"23 Black Leaders in Vancouver" — Vancouver Economic Commission' },
  { label: 'Media', value: 'Montecristo Magazine' },
  { label: 'Programs', value: "Canada's First National Procurement Readiness Course" },
  { label: 'Impact', value: '3,000+ entrepreneurs trained | 17–21 businesses into procurement pipelines' },
  { label: 'Funded by', value: 'ISED Canada | SBCCI | FFBC' },
  { label: 'Partners', value: 'Shared Services Canada | Procurement Assistance Canada | Women\'s Economic Council' },
]

const values = [
  {
    title: 'Access Is Earned Through Knowledge',
    body: 'The procurement system is complex by design. We believe every business deserves to understand it — and compete in it on equal footing. Complexity is not a barrier we accept.',
  },
  {
    title: 'Honest Counsel Over Comfortable Advice',
    body: "We tell clients what they need to hear, not what they want to hear. That sometimes means difficult conversations. The goal is results, not a long engagement.",
  },
  {
    title: 'Equity Is Structural, Not Performative',
    body: 'Supplier diversity and inclusive procurement are economic strategies, not optics. We help clients build the systems and habits that make equity real — not just visible.',
  },
  {
    title: 'Community Is Strategy',
    body: 'Our deep roots in entrepreneur ecosystems and equity-deserving networks are not just values. They are competitive advantages for every client we work with.',
  },
]

export default function About() {
  return (
    <div className="pt-16">

      <PageHero
        image="/images/hero-2.jpg"
        label="About Kasandy Consulting"
        title="A firm built on proof, not promises."
        subtitle="Twenty-five years of corporate marketing, entrepreneurship, and systemic change — distilled into strategy you can actually use."
        position="object-top"
      />

      {/* The Firm */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div className="md:col-span-2">
            <span className="section-label">About the Firm</span>
            <h2 className="section-heading mb-8">Kasandy Consulting</h2>
            <div className="space-y-5 font-sans text-sm text-kc-gray-mid leading-relaxed">
              <p>Kasandy Consulting is a Black woman-owned consulting and advisory firm based in Vancouver, BC. We work with entrepreneurs, governments, non-profits, and international businesses who are serious about growth — the kind that lasts.</p>
              <p>We specialise in procurement strategy and supplier diversity, full-service business coaching, non-profit transformation, and international market entry. What connects all of it is a single belief: access to systems, knowledge, and networks should not depend on who you know or where you started.</p>
              <p>Our clients range from solo founders preparing their first government bid to federal agencies designing supplier diversity programs. The work is different. The standard is the same — clear strategy, honest counsel, and measurable results.</p>
            </div>
          </div>
          <div className="border-l border-kc-gray-border pl-10 hidden md:block">
            <p className="font-display text-5xl text-kc-brown font-light mb-2">25+</p>
            <p className="font-sans text-xs text-kc-gray-mid tracking-wide uppercase mb-8">Years of experience</p>
            <p className="font-display text-5xl text-kc-brown font-light mb-2">3,000+</p>
            <p className="font-sans text-xs text-kc-gray-mid tracking-wide uppercase mb-8">Entrepreneurs trained</p>
            <p className="font-display text-5xl text-kc-brown font-light mb-2">17–21</p>
            <p className="font-sans text-xs text-kc-gray-mid tracking-wide uppercase">Businesses into procurement pipelines</p>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-16">
          <div className="md:col-span-2">
            <span className="section-label">Meet Jackee Kasandy</span>
            <h2 className="section-heading mb-2">Founder & Principal Consultant</h2>
            <p className="font-display text-xl italic text-kc-gray-mid mb-10">Her Story</p>

            <div className="space-y-5 font-sans text-sm text-kc-gray-mid leading-relaxed">
              <p>Jackee Kasandy has spent over two decades at the intersection of marketing, entrepreneurship, and systemic change.</p>
              <p>Her career began in some of Canada's leading advertising agencies — Cossette Communications, Bensimon Byrne, DDB Canada — where she managed accounts for McDonald's, Loblaw Brands, BC Ferries, Heinz Canada, and others. She developed deep expertise in integrated campaign strategy, consumer research, and brand positioning across TV, radio, print, and digital.</p>
              <p>She moved into corporate marketing, serving as Manager of Corporate and Vacations Marketing at BC Ferries and Manager of Marketing and WorkSafeBC Experience at WorkSafeBC — leading large-scale, multi-year initiatives and learning what it takes to build brands and move people to action at an institutional level.</p>
              <p>In 2014, she made the leap into entrepreneurship. She founded Kasandy Inc. — a thriving lifestyle brand with a flagship brick-and-mortar retail store at historic Granville Island in Vancouver, BC. A 7-figure business built from the ground up.</p>
              <p>But it was her growing frustration with who gets access to corporate and government contracts that sparked her most significant work. In 2020, she founded the Black Entrepreneurs & Businesses of Canada Society (BEBC Society) — and designed Canada's first supplier-focused procurement and certification readiness course. That program has now supported over 3,000 participants nationally, helping underrepresented founders and newcomer entrepreneurs navigate and win government and corporate contracts. Seventeen to twenty-one of those businesses have reported securing procurement contracts, some at multi-million-dollar scale.</p>
              <p>Today, Jackee serves as a BC Housing Board Commissioner, appointed by Minister Ravi Kahlon. She sits on the Board of Directors at Union Gospel Mission in Vancouver. She leads Kasandy Consulting as Principal Consultant — working with clients across Canada and internationally.</p>
              <p>She was recognised by the Vancouver Economic Commission as one of the "23 Black Leaders in Vancouver" and featured in Montecristo Magazine. She is a keynote speaker, a relentless advocate for equity in procurement, and a mentor to hundreds of entrepreneurs and leaders across North America.</p>
            </div>
          </div>

          {/* Credentials Sidebar */}
          <div>
            <div className="bg-white border border-kc-gray-border p-8 sticky top-24">
              <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-6">Credentials</p>
              <div className="space-y-5">
                {credentials.map((c) => (
                  <div key={c.label}>
                    <p className="font-sans text-[10px] tracking-wider uppercase text-kc-gray-mid mb-1">{c.label}</p>
                    <p className="font-sans text-xs text-kc-black leading-relaxed">{c.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Our Values</span>
          <h2 className="section-heading mb-16">What We Stand For</h2>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
            {values.map((v) => (
              <div key={v.title}>
                <div className="w-8 h-0.5 bg-kc-brown mb-4" />
                <h3 className="font-display text-2xl font-light mb-3">{v.title}</h3>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recognition */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Recognition & Media</span>
          <h2 className="section-heading mb-12">Recognition & Media</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              '"23 Black Leaders in Vancouver" — Vancouver Economic Commission',
              'Featured in Montecristo Magazine',
              'BC Housing Board Commissioner — Appointed by Minister Ravi Kahlon, Province of BC',
              'Funded initiatives: Innovation, Science & Economic Development Canada | SBCCI | FFBC',
              'Partners: Shared Services Canada | Procurement Assistance Canada | Women\'s Economic Council',
              'Board: Union Gospel Mission, Vancouver',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 border border-kc-gray-border bg-white p-5">
                <span className="text-kc-brown mt-0.5 shrink-0">—</span>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-kc-black text-white">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display text-4xl font-light text-white mb-5">Want to know if we're the right fit?</h2>
          <p className="font-sans text-sm text-white/60 leading-relaxed mb-10">
            Book a complimentary 15-minute strategy call. No pitch, no pressure — just an honest conversation about what you're building and how we might help.
          </p>
          <Link href="/contact" className="btn-brown">Book a Strategy Call</Link>
        </div>
      </section>

    </div>
  )
}
