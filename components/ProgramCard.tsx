'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

type ProgramCardProps = {
  tier: string
  subtitle: string
  fromPrice: string
  description: string
  includes: string[]
  outcome?: string
  ideal?: string
  featured?: boolean
  requestProposal?: boolean
  ctaHref?: string
  ctaLabel?: string
}

export default function ProgramCard({
  tier,
  subtitle,
  fromPrice,
  description,
  includes,
  outcome,
  ideal,
  featured = false,
  requestProposal = false,
  ctaHref = '/contact',
  ctaLabel = 'Inquire About This Program',
}: ProgramCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`bg-white border ${featured ? 'border-kc-brown shadow-md' : 'border-kc-gray-border'} flex flex-col`}>
      {/* Always-visible header */}
      <div className="p-8 flex-1">
        {featured && (
          <p className="font-sans text-[10px] tracking-widest uppercase text-kc-brown mb-3">Most Popular</p>
        )}
        <h3 className="font-display text-2xl font-light mb-1">{tier}</h3>
        <p className="font-sans text-xs text-kc-gray-mid mb-4">{subtitle}</p>

        {requestProposal ? (
          <p className="font-sans text-sm font-medium text-kc-brown mb-4">Custom engagement</p>
        ) : (
          <p className="font-display text-xl text-kc-brown mb-4">{fromPrice}</p>
        )}

        <p className="font-sans text-sm text-kc-gray-mid leading-relaxed mb-6">{description}</p>

        {/* Expand toggle */}
        {!requestProposal && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 font-sans text-xs tracking-wide text-kc-brown hover:text-kc-brown/70 transition-colors mb-2"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            />
            {expanded ? 'Hide details' : '+ View full scope & pricing'}
          </button>
        )}
      </div>

      {/* Expandable detail */}
      <div className={`overflow-hidden transition-all duration-300 ${expanded || requestProposal ? 'max-h-[1000px]' : 'max-h-0'}`}>
        <div className="px-8 pb-8 border-t border-kc-gray-border pt-6">
          <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-3">Includes</p>
          <ul className="space-y-2 mb-6">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-kc-brown shrink-0 text-xs mt-0.5">—</span>
                <span className="font-sans text-xs text-kc-gray-mid leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          {outcome && (
            <div className="bg-kc-gray-light p-4 mb-6">
              <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-2">Outcome</p>
              <p className="font-sans text-xs text-kc-black italic leading-relaxed">{outcome}</p>
            </div>
          )}

          {ideal && (
            <div className="mb-6">
              <p className="font-sans text-[10px] tracking-wide uppercase text-kc-gray-mid mb-2">Ideal for</p>
              <p className="font-sans text-xs text-kc-black italic leading-relaxed">{ideal}</p>
            </div>
          )}

          <Link
            href={ctaHref}
            className={featured ? 'btn-brown w-full justify-center' : 'btn-outline w-full justify-center'}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>

      {/* Request proposal CTA (always visible for proposal-only cards) */}
      {requestProposal && (
        <div className="px-8 pb-8">
          <Link href={ctaHref} className="btn-outline w-full justify-center">
            {ctaLabel}
          </Link>
        </div>
      )}
    </div>
  )
}
