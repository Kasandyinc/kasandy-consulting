'use client'

import Link from 'next/link'
import { ShoppingCart, Lock } from 'lucide-react'

type Props = {
  id: string
  title: string
  description: string
  format: string
  category: string
  price: string
  squareUrl?: string
  enabled?: boolean
  comingSoon?: boolean
}

export default function PaidProductCard({
  title,
  description,
  format,
  category,
  price,
  squareUrl,
  comingSoon,
}: Props) {
  const canBuy = !comingSoon && Boolean(squareUrl)
  const showContact = !comingSoon && !squareUrl

  return (
    <div className="card flex flex-col border border-kc-gray-border">
      <div className="flex items-center justify-between mb-4">
        <span className="font-sans text-[10px] tracking-widest uppercase text-kc-brown">{category}</span>
        <div className="flex items-center gap-2">
          <span className="font-sans text-[10px] text-kc-gray-mid">{format}</span>
          {comingSoon && (
            <span className="font-sans text-[9px] tracking-widest uppercase bg-kc-gray-light text-kc-gray-mid px-2 py-0.5">Coming Soon</span>
          )}
        </div>
      </div>

      <h3 className="font-display text-xl font-light leading-snug mb-2">{title}</h3>
      <div className="font-display text-2xl text-kc-brown mb-3">{price}</div>
      <p className="font-sans text-xs text-kc-gray-mid leading-relaxed mb-6 flex-1">{description}</p>

      {canBuy ? (
        <a
          href={squareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brown w-full justify-center flex items-center gap-2"
        >
          <ShoppingCart size={14} />
          Buy Now — {price}
        </a>
      ) : showContact ? (
        <Link
          href="/contact"
          className="btn-outline w-full justify-center flex items-center gap-2 text-xs"
        >
          <Lock size={13} />
          Enquire to Purchase
        </Link>
      ) : (
        <div className="border border-dashed border-kc-gray-border px-4 py-3 text-center">
          <p className="font-sans text-xs text-kc-gray-mid">Available soon — {price}</p>
        </div>
      )}
    </div>
  )
}
