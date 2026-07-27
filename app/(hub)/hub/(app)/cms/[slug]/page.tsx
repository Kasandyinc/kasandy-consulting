import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { rowToConfig } from '@/lib/forms/config'
import { SystemStrip } from '../../../../_components/ui'
import FormEditor from './FormEditor'

export const dynamic = 'force-dynamic'

export default async function EditFormPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data } = await supabase.from('site_forms').select('*').eq('slug', params.slug).maybeSingle()

  if (!data) notFound()
  const form = rowToConfig(data)

  return (
    <>
      <Link href="/cms" className="btn sm">← Forms</Link>

      <div style={{ marginTop: 14 }}>
        <div className="eyebrow">Website CMS</div>
        <h1 className="h1">{form.name}</h1>
        <p className="lede">{form.description ?? 'Public website form.'}</p>
      </div>

      <FormEditor form={form} />

      <SystemStrip>
        Field keys are fixed — the API routes store submissions by key, so renaming one
        here would detach the field from the route that reads it. Labels, options,
        required flags and copy are yours to change.
      </SystemStrip>
    </>
  )
}
