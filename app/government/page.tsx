import type { Metadata } from 'next'
import Link from 'next/link'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Procurement Strategy & Supplier Diversity Consulting | Kasandy Consulting',
  description: 'Inclusive procurement program design, supplier diversity facilitation, and Indigenous procurement training for government agencies and public sector organisations. Canada-wide.',
}

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

export default function Government() {
  return (
    <div className="pt-16">

      <PageHero
        image="/images/hero-government.jpg"
        label="For Government & Public Sector"
        title="Supplier diversity policy without delivery is just paperwork."
        subtitle="Procurement strategy, training, and facilitation for government agencies and public sector organisations serious about building inclusive supply chains that work."
        position="object-center"
      />

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
            {[
              {
                tier: 'Advisory',
                subtitle: 'Strategic Procurement Consulting',
                scope: 'Project-based or retainer',
                items: [
                  'Supplier diversity audit and gap analysis',
                  'Inclusive procurement policy and program co-design',
                  'Stakeholder facilitation sessions (government + community)',
                  'Written strategy report with implementation roadmap',
                  'Buyer-facing supplier diversity toolkit',
                ],
                ideal: 'Federal, provincial, and municipal procurement teams | Crown corporations | Economic development agencies',
              },
              {
                tier: 'Training',
                subtitle: 'Procurement Readiness Program Delivery',
                scope: 'Per cohort, per day, or multi-cohort contract',
                items: [
                  'Customised curriculum for your supplier community',
                  'Indigenous procurement training (ISET-aligned, culturally grounded)',
                  'Supplier readiness modules: capability statements, RFP response, certification',
                  'Virtual and in-person delivery options',
                  'Post-program outcome report for funders and evaluators',
                ],
                ideal: 'ISET partners | Indigenous Economic Development organisations | EDOs | Crown corporations with supplier diversity mandates',
                featured: true,
              },
              {
                tier: 'Retainer',
                subtitle: 'Ongoing Procurement Inclusion Advisory',
                scope: 'Monthly retainer | multi-year partnership',
                items: [
                  'Embedded advisory support for procurement team',
                  'Program evaluation, reporting, and continuous improvement',
                  'Stakeholder liaison: community, industry, government',
                  'Annual curriculum review and update',
                  'Government funder reporting and compliance support',
                ],
                ideal: 'Large departments and agencies with sustained supplier diversity mandates | Multi-year funded programs',
              },
            ].map((s) => (
              <div key={s.tier} className={`bg-white p-8 border ${s.featured ? 'border-kc-brown' : 'border-kc-gray-border'}`}>
                {s.featured && <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Most Requested</p>}
                <h3 className="font-display text-2xl font-light mb-1">{s.tier}</h3>
                <p className="font-sans text-xs text-kc-gray-mid mb-1">{s.subtitle}</p>
                <p className="font-sans text-[11px] text-kc-brown mb-5">{s.scope}</p>
                <ul className="space-y-2 mb-6">
                  {s.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-kc-brown shrink-0 text-xs">—</span>
                      <span className="font-sans text-xs text-kc-gray-mid leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-kc-gray-border pt-4">
                  <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-1">Ideal for</p>
                  <p className="font-sans text-xs text-kc-black italic">{s.ideal}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/contact" className="btn-primary">Request a Proposal</Link>
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
