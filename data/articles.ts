export type Article = {
  id: string
  slug: string
  title: string
  category: string
  excerpt: string
  date: string
  published: boolean
  readTime?: string
  author?: string
}

export const articles: Article[] = [
  {
    id: '1',
    slug: 'procurement-bids-losing',
    title: 'The 5 Reasons Your Procurement Bids Keep Losing (And What to Do About It)',
    category: 'Procurement',
    excerpt: "Most bids fail before they're read. Here's what Canadian buyers actually see when they open your submission — and the five fixable mistakes that are costing you contracts.",
    date: '2026-05-01',
    published: true,
    readTime: '7 min',
    author: 'Jackee Kasandy',
  },
  {
    id: '2',
    slug: 'what-buyers-look-for',
    title: 'What Canadian Buyers Actually Look for in a Supplier Diversity Submission',
    category: 'Procurement',
    excerpt: "Certification gets you in the room. It doesn't win the contract. After training 3,000+ entrepreneurs, here's what separates winning submissions from the ones that get filed away.",
    date: '2026-05-01',
    published: true,
    readTime: '5 min',
    author: 'Jackee Kasandy',
  },
  {
    id: '3',
    slug: 'grant-dependency-trap',
    title: 'The Grant Dependency Trap — And Three Ways Non-Profits Break Out of It',
    category: 'Non-Profit Leadership',
    excerpt: "If your budget depends on two or three funders, you're one relationship away from a crisis. Here are the three paths that actually work — and why most non-profits keep deferring them.",
    date: '2026-05-01',
    published: true,
    readTime: '7 min',
    author: 'Jackee Kasandy',
  },
  {
    id: '4',
    slug: 'kenyan-business-canada',
    title: 'How a Kenyan Business Enters the Canadian Procurement Market — The Honest Guide',
    category: 'International',
    excerpt: "No sugarcoating. Here's what it actually takes, what disqualifies applicants before their bid is even read, and the 7 steps to building a credible Canadian supplier profile.",
    date: '2026-05-01',
    published: true,
    readTime: '8 min',
    author: 'Jackee Kasandy',
  },
  {
    id: '5',
    slug: '3000-entrepreneurs',
    title: 'What 3,000 Entrepreneurs Taught Me About Why Procurement Fails',
    category: 'Procurement',
    excerpt: "I designed Canada's first supplier-focused procurement readiness course. After 3,000+ participants, the patterns are clear — and the same four mistakes keep showing up.",
    date: '2026-05-01',
    published: true,
    readTime: '6 min',
    author: 'Jackee Kasandy',
  },
  {
    id: '6',
    slug: 'supplier-diversity-market-correction',
    title: 'Supplier Diversity Is Not a Favour — It\'s a Market Correction',
    category: 'Advocacy',
    excerpt: 'The "charitable generosity" framing of supplier diversity is wrong and harmful. The economic case for it is overwhelming. Here\'s why this distinction matters more than most people realise.',
    date: '2026-05-01',
    published: true,
    readTime: '6 min',
    author: 'Jackee Kasandy',
  },
]
