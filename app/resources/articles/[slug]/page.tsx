import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { articles } from '@/data/articles'
import { articleBodies } from '@/data/article-content'
import { ArrowLeft, Clock, User } from 'lucide-react'

type Props = { params: { slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = articles.find(a => a.slug === params.slug && a.published)
  if (!article) return { title: 'Article Not Found' }
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: 'article',
      publishedTime: article.date,
      authors: [article.author ?? 'Jackee Kasandy'],
    },
  }
}

export function generateStaticParams() {
  return articles.filter(a => a.published).map(a => ({ slug: a.slug }))
}

const categoryColors: Record<string, string> = {
  Procurement: 'bg-kc-brown/10 text-kc-brown',
  'Non-Profit Leadership': 'bg-kc-black/10 text-kc-black',
  International: 'bg-kc-gray-border text-kc-gray-mid',
  Advocacy: 'bg-amber-100 text-amber-800',
  Entrepreneurs: 'bg-kc-brown/10 text-kc-brown',
}

export default function ArticlePage({ params }: Props) {
  const article = articles.find(a => a.slug === params.slug && a.published)
  if (!article) notFound()

  const body = articleBodies.find(b => b.slug === params.slug)
  const relatedArticles = articles
    .filter(a => a.published && a.slug !== params.slug && a.category === article.category)
    .slice(0, 2)

  return (
    <div className="pt-16">

      {/* ── Header ── */}
      <section className="bg-kc-warm-white border-b border-kc-gray-border py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Link href="/resources" className="inline-flex items-center gap-2 font-sans text-xs text-kc-gray-mid hover:text-kc-brown transition-colors mb-8">
            <ArrowLeft size={13} /> Back to Resources
          </Link>

          <div className="flex items-center gap-3 mb-5">
            <span className={`font-sans text-[10px] tracking-widest uppercase px-2 py-1 ${categoryColors[article.category] || 'bg-kc-gray-light text-kc-gray-mid'}`}>
              {article.category}
            </span>
            {article.readTime && (
              <span className="flex items-center gap-1 font-sans text-[11px] text-kc-gray-mid">
                <Clock size={11} /> {article.readTime} read
              </span>
            )}
          </div>

          <h1 className="font-display font-bold text-kc-charcoal leading-[1.08] mb-6 tracking-[-0.01em]"
            style={{ fontSize: 'clamp(28px,3.5vw,48px)' }}>
            {article.title}
          </h1>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-kc-brown rounded-full flex items-center justify-center shrink-0">
              <User size={14} className="text-white" />
            </div>
            <div>
              <p className="font-sans text-xs font-medium text-kc-black">{article.author ?? 'Jackee Kasandy'}</p>
              <p className="font-sans text-[10px] text-kc-gray-mid">
                {new Date(article.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Article body ── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">

          {body ? (
            <div className="prose-article">
              {/* Intro */}
              {body.intro && (
                <div className="mb-10">
                  {body.intro.split('\n\n').map((p, i) => (
                    <p key={i} className="font-sans text-[16px] leading-[1.82] text-kc-text-mid mb-5">{p}</p>
                  ))}
                </div>
              )}

              {/* Sections */}
              {body.sections.map((section, si) => (
                <div key={si} className="mb-10">
                  {section.heading && (
                    <h2 className="font-display text-2xl font-light text-kc-charcoal mb-4 leading-snug">
                      {section.heading}
                    </h2>
                  )}
                  {section.paragraphs.map((p, pi) => (
                    <p key={pi} className="font-sans text-[16px] leading-[1.82] text-kc-text-mid mb-4">{p}</p>
                  ))}
                </div>
              ))}

              {/* Closing */}
              {body.closing && (
                <div className="border-l-[3px] border-kc-brown pl-6 mt-12 mb-10">
                  {body.closing.split('\n\n').map((p, i) => (
                    <p key={i} className="font-sans text-[16px] leading-[1.82] text-kc-text-mid mb-4 italic">{p}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Fallback: just show excerpt
            <p className="font-sans text-[16px] leading-[1.82] text-kc-text-mid">{article.excerpt}</p>
          )}

          {/* Author bio */}
          <div className="border-t border-kc-gray-border mt-16 pt-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-kc-brown rounded-full flex items-center justify-center shrink-0">
                <User size={20} className="text-white" />
              </div>
              <div>
                <p className="font-sans text-sm font-semibold text-kc-black mb-1">{article.author ?? 'Jackee Kasandy'}</p>
                <p className="font-sans text-xs text-kc-gray-mid leading-relaxed">
                  Jackee Kasandy is the founder of the BEBC Society and Principal of Kasandy Consulting. She designed Canada&apos;s first supplier-focused procurement readiness course and has trained over 3,000 entrepreneurs nationally.
                </p>
                <Link href="/about" className="font-sans text-xs text-kc-brown hover:underline mt-2 inline-block">
                  About Jackee →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 bg-kc-black text-white">
        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Work With Jackee</p>
            <h2 className="font-display text-3xl font-light text-white mb-4">Ready to apply this to your business?</h2>
            <p className="font-sans text-sm text-white/60 leading-relaxed">
              A 90-minute Discovery Session gives you a complete picture of where you stand and exactly what to do next — with a written action plan.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/contact" className="btn-brown text-center justify-center">Book a Discovery Session</Link>
            <Link href="/resources" className="btn-outline border-white text-white hover:bg-white hover:text-kc-black text-center justify-center">
              Browse More Resources
            </Link>
          </div>
        </div>
      </section>

      {/* ── Related articles ── */}
      {relatedArticles.length > 0 && (
        <section className="py-16 px-6">
          <div className="max-w-3xl mx-auto">
            <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-6">More on {article.category}</p>
            <div className="grid sm:grid-cols-2 gap-6">
              {relatedArticles.map(a => (
                <Link key={a.id} href={`/resources/articles/${a.slug}`}
                  className="group border border-kc-gray-border p-6 hover:border-kc-brown transition-colors block">
                  <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-2">{a.category}</p>
                  <h3 className="font-display text-lg font-light text-kc-black group-hover:text-kc-brown transition-colors leading-snug mb-2">{a.title}</h3>
                  <p className="font-sans text-xs text-kc-gray-mid leading-relaxed">{a.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
