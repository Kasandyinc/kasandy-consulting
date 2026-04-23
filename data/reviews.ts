export type Review = {
  id: string
  name: string
  title: string
  organisation: string
  quote: string
  audience: 'entrepreneur' | 'government' | 'nonprofit' | 'international'
  featured: boolean
  approved: boolean
  date: string
}

export const reviews: Review[] = []
