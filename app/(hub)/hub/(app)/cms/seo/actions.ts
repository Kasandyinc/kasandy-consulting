'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import { SEO_TAG } from '@/lib/cms/seo'

async function operator() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, email: user?.email, ok: isOperator(user?.email) }
}

export async function savePageMeta(args: {
  path: string
  title: string
  description: string
  ogImage: string
  noindex: boolean
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { data: updated, error } = await supabase
    .from('page_meta')
    .update({
      title: args.title.trim() || null,
      description: args.description.trim() || null,
      og_image: args.ogImage.trim() || null,
      noindex: args.noindex,
    })
    .eq('path', args.path)
    .select('path')

  if (error) return { ok: false, error: error.message }
  if (!updated?.length) return { ok: false, error: `No page registered at ${args.path}.` }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'seo.page_updated',
    entity: 'page_meta',
    entity_id: null,
    meta: { path: args.path, noindex: args.noindex },
  })

  revalidateTag(SEO_TAG)
  revalidatePath('/cms/seo')
  return { ok: true }
}

/**
 * Save the site-wide tracking configuration.
 *
 * `pixels_enabled` is a single switch that turns all of them off — useful during a
 * launch, and honest about the fact that these load third-party code on visitors'
 * browsers.
 */
export async function saveSiteSettings(args: {
  ga4Id: string
  metaPixelId: string
  linkedinPartnerId: string
  pixelsEnabled: boolean
  defaultOgImage: string
  contactEmail: string
}) {
  const { supabase, email, ok } = await operator()
  if (!ok) return { ok: false, error: 'Not authorized.' }

  const { error } = await supabase
    .from('site_settings')
    .update({
      ga4_id: args.ga4Id.trim() || null,
      meta_pixel_id: args.metaPixelId.trim() || null,
      linkedin_partner_id: args.linkedinPartnerId.trim() || null,
      pixels_enabled: args.pixelsEnabled,
      default_og_image: args.defaultOgImage.trim() || null,
      contact_email: args.contactEmail.trim() || null,
    })
    .eq('id', true)

  if (error) return { ok: false, error: error.message }

  await supabase.from('audit_log').insert({
    actor: email,
    action: 'seo.settings_updated',
    entity: 'site_settings',
    entity_id: null,
    meta: { pixels_enabled: args.pixelsEnabled },
  })

  revalidateTag(SEO_TAG)
  revalidatePath('/cms/seo')
  return { ok: true }
}
