export type Article = {
  id: string
  slug: string
  title: string
  category: string
  excerpt: string
  date: string
  published: boolean
}

export const articles: Article[] = [
  { id: '1', slug: 'procurement-bids-losing', title: 'The 5 Reasons Your Procurement Bids Keep Losing (And What to Do About It)', category: 'Procurement', excerpt: 'Most bids fail before they\'re read. Here\'s what Canadian buyers actually see — and what you need to fix.', date: '2026-04-01', published: false },
  { id: '2', slug: 'what-buyers-look-for', title: 'What Canadian Buyers Actually Look for in a Supplier Diversity Submission', category: 'Procurement', excerpt: 'After training 3,000+ entrepreneurs, here\'s what separates winning submissions from the ones that get filed away.', date: '2026-04-01', published: false },
  { id: '3', slug: 'grant-dependency-trap', title: 'The Grant Dependency Trap — And Three Ways Non-Profits Break Out of It', category: 'Non-Profit Leadership', excerpt: 'If your budget depends on one or two funders, you\'re one relationship away from a crisis. Here\'s how to fix it.', date: '2026-04-01', published: false },
  { id: '4', slug: 'kenyan-business-canada', title: 'How a Kenyan Business Enters the Canadian Procurement Market — The Honest Guide', category: 'International', excerpt: 'No sugarcoating. Here\'s what it actually takes, what disqualifies you early, and how to build a credible Canadian supplier profile.', date: '2026-04-01', published: false },
  { id: '5', slug: '3000-entrepreneurs', title: 'What 3,000 Entrepreneurs Taught Me About Why Procurement Fails', category: 'Procurement', excerpt: 'The patterns are clear. The same mistakes keep showing up — and they\'re all fixable.', date: '2026-04-01', published: false },
  { id: '6', slug: 'supplier-diversity-market-correction', title: 'Supplier Diversity Is Not a Favour — It\'s a Market Correction', category: 'Advocacy', excerpt: 'The economic case is overwhelming. Here\'s why supplier diversity is one of the most underpowered growth strategies in Canada.', date: '2026-04-01', published: false },
]
