import type { Metadata } from 'next'
import Link from 'next/link'
import ProgramCard from '@/components/ProgramCard'
import { kv } from '@vercel/kv'

export const metadata: Metadata = {
  title: 'Procurement Strategy & Supplier Diversity Consulting',
  description: 'Inclusive procurement program design, supplier diversity facilitation, and Indigenous procurement training for government agencies and public sector organisations. Canada-wide.',
  openGraph: { images: [{ url: '/images/hero-government.jpg', width: 1200, height: 630 }] },
}

export const dynamic = 'force-dynamic'

type ProgramData = {
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

const hardcodedPrograms: ProgramData[] = [
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
    requestProposal: true,
    ctaLabel: 'Request a Proposal',
    ctaHref: '/contact',
  },
]

const qualifiers = [
  "Your department has supplier diversity commitments but lacks a credible, experienced delivery partner to execute them.",
  "You're looking for a facilitator with genuine credibility in Indigenous, Black, and equity-deserving business communities — not a firm performing inclusion from the outside.",
  "Your procurement training programs have low completion and application rates — and you need a curriculum that actually changes behaviour.",
  "Your RFP or funding agreement requires a certified, equity-focused supplier diversity specialist.",
  "You need outcomes data, evaluation frameworks, and funder-ready reporting.",
  "You want a partner who understands both the supplier side and the buyer side of the procurement relationship.",
]

const track = [
  "Designed and led Canada's first supplier-focused procurement and certification readiness course through the BEBC Society — supporting 3,000+ participants nationally.",
  "Led procurement training initiatives funded by Innovation, Science & Economic Development Canada, SBCCI, FFBC, and other federal programs.",
  "Partnerships with Shared Services Canada, Procurement Assistance Canada, Women's Economic Council, and municipalities across BC.",
  "Delivered Indigenous procurement training through the ISET partnership, with curriculum tailored to Indigenous learning styles and community governance.",
  "17–21 businesses from training cohorts secured procurement contracts, including multi-million-dollar outcomes.",
]

const faqs = [
  {
    q: 'Are you listed on any government supplier registries?',
    a: 'We are in the process of obtaining our D-U-N-S number and WBE certification. We hold BEBC Society certification. If your procurement vehicle requires a specific registration, contact us — we will confirm our current status and expected timelines.',
  },
  {
    q: 'Can you work within government procurement vehicles (e.g., ProServices, SBIPS)?',
    a: 'Yes. We are familiar with federal and provincial procurement frameworks and can deliver under standing offer, task and solutions professional services, and direct award mechanisms where eligible.',
  },
  {
    q: 'Can you customise curriculum for Indigenous communities?',
    a: 'This is one of our core strengths. Our Indigenous procurement training is not a generic curriculum with an Indigenous logo placed on it. We co-design with community input, incorporate oral teaching traditions, apply trauma-informed facilitation principles, and respect community governance and sovereignty throughout.',
  },
  {
    q: 'How do you measure and report on program outcomes?',
    a: 'We track participation rates, completion rates, procurement submissions, certifications achieved, and contracts won (where businesses consent to share outcomes). We provide written impact reports in formats suitable for funder reporting and evaluation.',
  },
]

export default async function Government() {
  const kvData = await kv.get<{ government?: ProgramData[] }>('programs:all')
  const programs: ProgramData[] = kvData?.government && kvData.government.length > 0
    ? kvData.government
    : hardcodedPrograms

  return (
    <div className="pt-16">

      {/* ── Hero ── */}
      <section className="relative flex items-center overflow-hidden" style={{ minHeight: '86vh' }}>
        {/* Full-bleed photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-government.jpg" alt=""
          className="absolute inset-0 w-full h-full object-cover object-[center_35%]"
          style={{ filter: 'brightness(0.92) saturate(0.9)' }} />
        {/* Overlay: warm-white from left fading to transparent right */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(110deg,rgba(253,252,250,.96) 0%,rgba(253,252,250,.82) 45%,rgba(253,252,250,.3) 100%)' }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-20 py-24 grid md:grid-cols-[1fr_340px] gap-16 md:gap-20 items-center">
          {/* Left */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <span className="block w-7 h-px bg-kc-brown flex-shrink-0" />
              <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-kc-brown">For Government &amp; Public Sector</span>
            </div>

            <h1 className="font-display font-bold text-kc-charcoal leading-[1.06] mb-6 tracking-[-0.01em]"
              style={{ fontSize: 'clamp(40px,4.5vw,64px)' }}>
              Supplier diversity policy<br />without delivery is<br />
              <em className="italic text-kc-brown block">just paperwork.</em>
            </h1>

            <p className="font-sans text-[16px] leading-[1.74] text-kc-text-mid max-w-[520px] mb-9">
              Procurement strategy, training, and facilitation for government agencies serious about building inclusive supply chains that actually work.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/contact" className="btn-brown">Request a Proposal</Link>
              <Link href="/work" className="btn-outline">See Our Track Record</Link>
            </div>
          </div>

          {/* Right: credentials */}
          <div className="hidden md:flex flex-col gap-2">
            {[
              "Canada's First National Procurement Readiness Course",
              "BC Housing Board Commissioner — appointed by Minister Ravi Kahlon",
              "Partners: Shared Services Canada | Procurement Assistance Canada",
              "Funded by: ISED Canada | SBCCI | FFBC",
              "Indigenous procurement training via ISET | 250+ trained",
            ].map((c, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-l-2 border-kc-linen"
                style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}>
                <span className="w-1.5 h-1.5 bg-kc-brown rounded-full flex-shrink-0 mt-1" />
                <span className="font-sans text-[12.5px] text-kc-text-mid leading-[1.45]">{c}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qualification */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
          <div>
            <span className="section-label">Right Fit</span>
            <h2 className="section-heading mb-12">This engagement is right for you if…</h2>
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
            <span className="section-label">Credibility</span>
            <h2 className="font-display text-3xl font-light mb-6">Why government clients choose Kasandy Consulting</h2>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-5">
              Kasandy Consulting's government credibility is not borrowed — it is built. Jackee Kasandy designed Canada's first national supplier-focused procurement readiness course. She has led federally funded training initiatives, partnered with Shared Services Canada and Procurement Assistance Canada, and currently serves as a BC Housing Board Commissioner.
            </p>
            <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">
              We do not arrive as outsiders explaining equity to communities. We arrive as practitioners with deep trust, established relationships, and a track record that government funders can cite.
            </p>
          </div>
        </div>
      </section>

      {/* Service Tiers */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Services</span>
          <h2 className="section-heading mb-16">Government Services</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {programs.map(p => (
              <ProgramCard key={p.tier} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* Track Record */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Track Record</span>
          <h2 className="section-heading mb-12">Proven Track Record</h2>
          <div className="space-y-4">
            {track.map((t) => (
              <div key={t} className="flex items-start gap-5 border-b border-kc-gray-border pb-5">
                <span className="text-kc-brown font-display text-2xl shrink-0">—</span>
                <p className="font-sans text-sm text-kc-gray-mid leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-kc-gray-light">
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
            <Link href="/contact" className="btn-primary">Request a Proposal</Link>
          </div>
        </div>
      </section>

    </div>
  )
}
