import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import PageHero from '@/components/PageHero'

export const metadata: Metadata = {
  title: 'Press & Media',
  description: 'Jackee Kasandy media coverage — Globe and Mail, CBC, CTV, Global News, Hill Times, Montecristo Magazine and more. 2.4M+ in earned media value.',
  openGraph: { images: [{ url: '/images/hero-press.jpg', width: 1200, height: 630 }] },
}

const mediaCoverage = [
  {
    outlet: 'The Globe and Mail',
    title: 'How Black entrepreneurs are working to knock down barriers to capital',
    url: 'https://www.theglobeandmail.com/business/small-business/article-how-black-entrepreneurs-are-working-to-knock-down-barriers-to-capital/',
    summary: 'Covers the BEBC Society\'s work and Jackee\'s experience with banking barriers when founding her business.',
    category: 'Print / Online',
    featured: true,
  },
  {
    outlet: 'The Globe and Mail',
    title: 'Black Business Certification Program is working with Ottawa to diversify procurement',
    url: 'https://www.theglobeandmail.com/business/small-business/article-black-business-certification-program-is-working-with-ottawa-to/',
    summary: 'Details BEBC\'s certification program and its federal procurement initiatives.',
    category: 'Print / Online',
    featured: true,
  },
  {
    outlet: 'CTV News',
    title: "'Prove our value': Black-owned business program gives owners a shot at government, corporate contracts",
    url: 'https://bc.ctvnews.ca/prove-our-value-black-owned-business-program-gives-owners-a-shot-at-government-corporate-contracts-1.6904929',
    summary: 'Coverage of BEBC\'s certification program and procurement opportunities for Black-owned businesses in BC.',
    category: 'TV / Online',
    featured: true,
  },
  {
    outlet: 'CTV News',
    title: 'Black entrepreneurs can enter contest for $25K in funding',
    url: 'https://www.ctvnews.ca/business/funding-woes-inspire-25k-pitching-competition-for-black-entrepreneurs-1.6280868',
    summary: 'Features the BEBC Black Pitch Contest, a $25,000 funding competition for Black entrepreneurs.',
    category: 'TV / Online',
  },
  {
    outlet: 'CBC News British Columbia',
    title: 'New program aims to help Black business owners land government, corporate contracts',
    url: 'https://www.cbc.ca/news/canada/british-columbia/black-owned-business-procurement-1.7218159',
    summary: 'Features BEBC\'s national certification program for government and corporate procurement.',
    category: 'TV / Radio / Online',
    featured: true,
  },
  {
    outlet: 'CBC News British Columbia',
    title: 'How a contest is helping to remove barriers for Black entrepreneurs',
    url: 'https://www.cbc.ca/news/canada/british-columbia/business-contest-black-entrepreneurs-b-c-1.6746732',
    summary: 'Covers BEBC\'s Black Pitch Contest and Jackee\'s role as founder in removing barriers to capital.',
    category: 'TV / Radio / Online',
  },
  {
    outlet: 'CBC News British Columbia',
    title: 'Black business owners in Vancouver share successes, calls to action',
    url: 'https://www.cbc.ca/news/canada/british-columbia/black-business-owners-in-vancouver-share-successes-calls-to-action-1.5599486',
    summary: 'Vancouver Black business owners share their experiences and advocacy for systemic change.',
    category: 'TV / Radio / Online',
  },
  {
    outlet: 'The Hill Times',
    title: 'Black-owned businesses need more funding to compete for federal contracts, says founder of new training program',
    url: 'https://www.hilltimes.com/story/2024/05/30/black-owned-businesses-need-more-funding-to-compete-for-federal-contracts-says-founder-of-new-training-program/423615/',
    summary: 'Jackee discusses funding barriers and BEBC\'s federal procurement training program in Ottawa\'s parliament hill publication.',
    category: 'Print / Online',
    date: 'May 30, 2024',
    featured: true,
  },
  {
    outlet: 'Global News BC',
    title: "Black-owned business program gives B.C. owners a shot at government contracts",
    url: 'https://globalnews.ca/news/10531124/black-owned-business-program-bc/',
    summary: "Coverage of BEBC's program providing B.C. Black business owners a pathway to government contracts.",
    category: 'TV / Online',
    featured: true,
  },
  {
    outlet: 'Montecristo Magazine',
    title: 'The Kenyan-Canadian Entrepreneur Connecting African Artistry to Vancouver Fashion',
    url: 'https://montecristomagazine.com/style/kenyan-canadian-african-artistry',
    summary: "Features Jackee's journey founding Kasandy, her fair-trade business model, and her connection between African artistry and Vancouver's fashion scene.",
    category: 'Magazine',
    featured: true,
  },
  {
    outlet: 'BC Business Magazine',
    title: "5 Questions: BEBC Society's Jackee Kasandy calls for changes to create a diverse business landscape",
    url: 'https://www.bcbusiness.ca/5-Questions-BEBC-Societys-Jackee-Kasandy-calls-for-changes-to-create-a-diverse-business-landscape',
    summary: 'Interview with Jackee discussing systemic barriers and her vision for a more inclusive Black business landscape in BC.',
    category: 'Magazine / Online',
  },
  {
    outlet: 'CanadianSME Small Business Magazine',
    title: 'Jackee Kasandy: Creating Business With The Interests Of People',
    url: 'https://canadiansme.ca/jackee-kasandy-creating-business-with-the-interests-of-people/',
    summary: "Feature on Jackee's business philosophy, entrepreneurial journey, and her commitment to building businesses that serve communities.",
    category: 'Online',
  },
  {
    outlet: 'Vancouver Guardian',
    title: 'Homegrown Business: Jackee Kasandy of Kasandy',
    url: 'https://vancouverguardian.com/vancouver-business-kasandy/',
    summary: 'Spotlight on Kasandy Inc. as a homegrown Vancouver business rooted in fair trade and community values.',
    category: 'Online',
  },
  {
    outlet: 'Vancouver Economic Commission',
    title: 'Envision the Future: Celebrate 23 Black Leaders in Vancouver',
    url: 'https://vancouvereconomic.com/blog/vecs_take/envision-the-future-celebrate-23-black-leaders-in-vancouver/',
    summary: 'Jackee Kasandy named one of 23 Black leaders in Vancouver for her advocacy, education, and leadership in supporting women and business owners.',
    category: 'Recognition',
    featured: true,
  },
]

const mediaStats = [
  { number: '380+', label: 'National media mentions (Jan–Jun 2024)' },
  { number: '$2.4M', label: 'Earned media value through BEBC' },
  { number: '$1.72M', label: 'Ad spend equivalent (Jan–Jun 2024 alone)' },
  { number: '28K+', label: 'Instagram followers across platforms' },
]

const categories = ['All', 'Print / Online', 'TV / Online', 'TV / Radio / Online', 'Magazine', 'Recognition']

export default function Press() {
  const featured = mediaCoverage.filter(m => m.featured)
  const all = mediaCoverage

  return (
    <div className="pt-16">

      <PageHero
        image="/images/jackee-speaking-2.jpg"
        label="Press & Media"
        title="In the News."
        subtitle="Jackee Kasandy and BEBC Society have been covered by Canada's most trusted media outlets. Over 380 national mentions and $2.4M in earned media value."
        position="object-top"
      />

      {/* Stats */}
      <section className="py-12 px-6 bg-kc-brown">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {mediaStats.map(s => (
            <div key={s.number} className="text-center text-white">
              <p className="font-display text-4xl font-light mb-1">{s.number}</p>
              <p className="font-sans text-xs text-white/70">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Coverage */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">Featured Coverage</span>
          <h2 className="section-heading mb-12">Highlighted Stories</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {featured.map(item => (
              <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer"
                className="group border border-kc-gray-border p-8 hover:border-kc-brown transition-all hover:shadow-sm block">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown">{item.outlet}</p>
                  <span className="font-sans text-[10px] tracking-wide text-kc-gray-mid border border-kc-gray-border px-2 py-0.5 shrink-0">{item.category}</span>
                </div>
                <h3 className="font-display text-xl font-light text-kc-black mb-3 group-hover:text-kc-brown transition-colors leading-snug">
                  {item.title}
                </h3>
                <p className="font-sans text-xs text-kc-gray-mid leading-relaxed mb-4">{item.summary}</p>
                {item.date && <p className="font-sans text-[10px] text-kc-gray-mid">{item.date}</p>}
                <span className="flex items-center gap-1.5 font-sans text-xs text-kc-black group-hover:text-kc-brown transition-colors mt-2">
                  Read Article <ExternalLink size={11} />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* All Coverage */}
      <section className="py-20 px-6 bg-kc-gray-light">
        <div className="max-w-7xl mx-auto">
          <span className="section-label">All Coverage</span>
          <h2 className="section-heading mb-12">All Media Coverage</h2>
          <div className="space-y-0">
            {all.map((item, i) => (
              <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer"
                className={`group flex items-start justify-between gap-6 py-6 hover:bg-white hover:px-4 transition-all block ${i < all.length - 1 ? 'border-b border-kc-gray-border' : ''}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown shrink-0">{item.outlet}</p>
                    {item.date && <p className="font-sans text-[10px] text-kc-gray-mid">{item.date}</p>}
                  </div>
                  <p className="font-display text-lg font-light text-kc-black group-hover:text-kc-brown transition-colors mb-1 leading-snug">{item.title}</p>
                  <p className="font-sans text-xs text-kc-gray-mid leading-relaxed hidden md:block">{item.summary}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-sans text-[10px] tracking-wide text-kc-gray-mid border border-kc-gray-border px-2 py-0.5 hidden sm:block">{item.category}</span>
                  <ExternalLink size={14} className="text-kc-gray-mid group-hover:text-kc-brown transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Media Outlets Marquee */}
      <section className="py-10 px-6 border-y border-kc-gray-border overflow-hidden">
        <p className="font-sans text-[10px] tracking-widest uppercase text-kc-gray-mid text-center mb-6">As Seen In</p>
        <div className="flex gap-12 overflow-x-auto pb-2 justify-center flex-wrap">
          {['Globe and Mail', 'CBC News', 'CTV News', 'Global News', 'The Hill Times', 'Montecristo Magazine', 'BC Business', 'Vancouver Sun', 'CP24', 'Vancouver Economic Commission'].map(outlet => (
            <span key={outlet} className="font-display text-lg font-light text-kc-gray-mid whitespace-nowrap">{outlet}</span>
          ))}
        </div>
      </section>

      {/* Media Kit Download */}
      <section className="py-20 px-6 bg-kc-black text-white text-center">
        <div className="max-w-xl mx-auto">
          <span className="section-label text-kc-brown">For Media</span>
          <h2 className="font-display text-4xl font-light text-white mb-5">Media & Press Enquiries</h2>
          <p className="font-sans text-sm text-white/60 mb-10 leading-relaxed">
            For interview requests, media features, or event coverage, contact Jackee directly with <strong className="text-white">MEDIA</strong> in the subject line. Response within one business day.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="mailto:jackee@kasandy.com?subject=MEDIA" className="btn-brown">
              Media Enquiry
            </a>
            <a href="/files/jackee-kasandy-speaker-kit.pdf" className="btn-outline border-white text-white hover:bg-white hover:text-kc-black">
              Download Speaker Kit (PDF)
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
