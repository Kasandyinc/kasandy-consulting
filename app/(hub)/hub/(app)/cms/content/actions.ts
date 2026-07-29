'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { POSTS_TAG } from '@/lib/cms/posts'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

/** URL-safe slug. Kept stable once published — a changed slug is a broken link. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function savePost(args: {
  id?: string
  slug: string
  kind: string
  title: string
  excerpt: string
  bodyMd: string
  author: string
  tags: string
  status: string
  seoTitle: string
  seoDescription: string
  gated: boolean
  noindex: boolean
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }
  if (!args.title.trim()) return { ok: false, error: 'A piece needs a title.' }

  const slug = slugify(args.slug || args.title)
  if (!slug) return { ok: false, error: 'That title produces no usable URL — add some letters.' }

  const payload = {
    slug,
    kind: args.kind,
    title: args.title.trim(),
    excerpt: args.excerpt.trim() || null,
    body_md: args.bodyMd,
    author: args.author.trim() || null,
    tags: args.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    status: args.status,
    seo_title: args.seoTitle.trim() || null,
    seo_description: args.seoDescription.trim() || null,
    gated: args.gated,
    noindex: args.noindex,
  }

  const { error } = args.id
    ? await supabase.from('posts').update(payload).eq('id', args.id)
    : await supabase.from('posts').insert(payload)

  if (error) {
    return {
      ok: false,
      error: error.code === '23505' ? `Something already lives at /${slug}.` : error.message,
    }
  }

  await supabase.from('audit_log').insert({
    actor: email,
    action: args.id ? 'post.updated' : 'post.created',
    entity: 'posts',
    entity_id: args.id ?? null,
    meta: { slug, status: args.status },
  })

  revalidateTag(POSTS_TAG)
  revalidatePath('/cms/content')
  return { ok: true }
}

export async function deletePost(id: string) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { data: post } = await supabase.from('posts').select('slug, status').eq('id', id).maybeSingle()

  // A published piece may have inbound links. Archiving keeps the row and the URL's
  // history; deleting is for drafts that never went anywhere.
  if (post?.status === 'published') {
    return { ok: false, error: 'This is published — archive it instead, so the URL keeps its history.' }
  }

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'post.deleted',
    entity: 'posts',
    entity_id: id,
    meta: { slug: post?.slug },
  })

  revalidateTag(POSTS_TAG)
  revalidatePath('/cms/content')
  return { ok: true }
}
