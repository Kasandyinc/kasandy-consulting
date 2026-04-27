import { NextRequest, NextResponse } from 'next/server'
import { kvGet, kvSet, KEYS } from '@/lib/kv'

type Article = {
  id: string
  slug: string
  title: string
  category: string
  excerpt: string
  date: string
  published: boolean
}

export async function GET() {
  const articles = await kvGet<Article[]>(KEYS.articles, [])
  return NextResponse.json(articles)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, title, category, excerpt, published } = body

    if (!title || !slug) {
      return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
    }

    const articles = await kvGet<Article[]>(KEYS.articles, [])
    const newArticle: Article = {
      id: Date.now().toString(),
      slug,
      title,
      category: category || '',
      excerpt: excerpt || '',
      date: new Date().toISOString().split('T')[0],
      published: published ?? false,
    }
    articles.push(newArticle)
    await kvSet(KEYS.articles, articles)
    return NextResponse.json(newArticle, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add article' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const articles = await kvGet<Article[]>(KEYS.articles, [])
    const idx = articles.findIndex(a => a.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

    const allowedKeys = ['published', 'title', 'excerpt', 'category', 'slug']
    const sanitised = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowedKeys.includes(k))
    )

    articles[idx] = { ...articles[idx], ...sanitised }
    await kvSet(KEYS.articles, articles)
    return NextResponse.json(articles[idx])
  } catch {
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const articles = await kvGet<Article[]>(KEYS.articles, [])
    const filtered = articles.filter(a => a.id !== id)
    await kvSet(KEYS.articles, filtered)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 })
  }
}
