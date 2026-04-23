import { NextRequest, NextResponse } from 'next/server'
import { readFile, writeFile } from 'fs/promises'
import path from 'path'

const FILE = path.join(process.cwd(), 'data', 'articles.json')

type Article = {
  id: string
  slug: string
  title: string
  category: string
  excerpt: string
  date: string
  published: boolean
}

async function readArticles(): Promise<Article[]> {
  try {
    const raw = await readFile(FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function GET() {
  const articles = await readArticles()
  return NextResponse.json(articles)
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const articles = await readArticles()
    const idx = articles.findIndex(a => a.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Article not found' }, { status: 404 })

    const allowedKeys = ['published', 'title', 'excerpt', 'category']
    const sanitised = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowedKeys.includes(k))
    )

    articles[idx] = { ...articles[idx], ...sanitised }
    await writeFile(FILE, JSON.stringify(articles, null, 2))
    return NextResponse.json(articles[idx])
  } catch {
    return NextResponse.json({ error: 'Failed to update article' }, { status: 500 })
  }
}
