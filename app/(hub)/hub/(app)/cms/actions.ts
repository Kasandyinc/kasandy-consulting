'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import type { FormField } from '@/lib/forms/config'
import { FORMS_TAG } from '@/lib/forms/load'

const FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'select', 'date'] as const

/**
 * Save one website form's configuration.
 *
 * Field *keys* are deliberately not editable from here. The API routes validate and
 * store by key, so renaming one in the CMS would silently detach the field from the
 * route that reads it — the label is what the visitor sees and what Jackee wants to
 * change; the key is plumbing.
 */
export async function saveForm(args: {
  slug: string
  name: string
  description: string
  submitLabel: string
  successMessage: string
  notifyEmail: string
  active: boolean
  fields: FormField[]
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  if (!args.name.trim()) return { ok: false, error: 'The form needs a name.' }
  if (!args.submitLabel.trim()) return { ok: false, error: 'The button needs a label.' }
  if (!args.successMessage.trim()) {
    return { ok: false, error: 'The thank-you message cannot be empty — visitors need to see something.' }
  }

  const seen = new Set<string>()
  const fields: FormField[] = []
  for (let i = 0; i < args.fields.length; i++) {
    const x = args.fields[i]
    const key = String(x.key ?? '').trim()
    if (!key || seen.has(key)) continue // a duplicate key would shadow a real field
    seen.add(key)
    const type = (FIELD_TYPES as readonly string[]).includes(x.type) ? x.type : 'text'
    const options = (x.options ?? []).map((o: string) => String(o).trim()).filter(Boolean)
    if (type === 'select' && options.length === 0) {
      return { ok: false, error: `"${x.label || key}" is a dropdown with no options.` }
    }
    fields.push({
      key,
      label: String(x.label ?? '').trim() || key,
      type: type as FormField['type'],
      required: Boolean(x.required),
      ...(options.length ? { options } : {}),
      ...(x.placeholder?.trim() ? { placeholder: x.placeholder.trim() } : {}),
      order: i + 1,
    })
  }

  if (fields.length === 0) return { ok: false, error: 'A form needs at least one field.' }

  const { data: updated, error } = await supabase
    .from('site_forms')
    .update({
      name: args.name.trim(),
      description: args.description.trim() || null,
      submit_label: args.submitLabel.trim(),
      success_message: args.successMessage.trim(),
      notify_email: args.notifyEmail.trim() || null,
      active: args.active,
      fields,
    })
    .eq('slug', args.slug)
    .select('slug')

  if (error) return { ok: false, error: error.message }
  // An update that matches nothing returns no error. Reporting that as saved would be a
  // lie the operator only discovers when the site does not change.
  if (!updated?.length) {
    return { ok: false, error: `No form named "${args.slug}" — nothing was saved.` }
  }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: 'form.saved',
    entity: 'site_forms',
    entity_id: null,
    meta: { slug: args.slug, fields: fields.length, active: args.active },
  })

  // The public site reads through a tagged cache; drop it so the edit is live now.
  revalidateTag(FORMS_TAG)
  revalidatePath('/cms')
  revalidatePath(`/cms/${args.slug}`)
  return { ok: true }
}

/**
 * Open or close a form. A closed form stops rendering on the public site; existing
 * submissions are untouched, because the record of what people sent is not the CMS's
 * to delete.
 */
export async function setFormActive(slug: string, active: boolean) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) return { ok: false, error: 'Not authorized.' }

  const { data: updated, error } = await supabase
    .from('site_forms')
    .update({ active })
    .eq('slug', slug)
    .select('slug')

  if (error) return { ok: false, error: error.message }
  if (!updated?.length) return { ok: false, error: `No form named "${slug}".` }

  await supabase.from('audit_log').insert({
    actor: user!.email,
    action: active ? 'form.opened' : 'form.closed',
    entity: 'site_forms',
    entity_id: null,
    meta: { slug },
  })

  revalidateTag(FORMS_TAG)
  revalidatePath('/cms')
  return { ok: true }
}
