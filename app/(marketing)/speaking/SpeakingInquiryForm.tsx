'use client'

import { useState } from 'react'
import Turnstile from '@/components/Turnstile'
import { FORM_DEFAULTS, labelFor, optionsFor, isRequired, type FormConfig } from '@/lib/forms/config'

/** Wording and options come from the hub CMS; layout and spam controls stay here. */
export default function SpeakingInquiryForm({
  config = FORM_DEFAULTS['speaking-inquiry'],
}: { config?: FormConfig }) {
  const [form, setForm] = useState({
    name: '',
    organisation: '',
    eventName: '',
    eventDate: '',
    location: '',
    audienceSize: '',
    format: '',
    topicInterest: '',
    budget: '',
    notes: '',
  })
  const [website, setWebsite] = useState('') // honeypot
  const [formLoadedAt] = useState(() => Date.now())
  const [turnstileToken, setTurnstileToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/speaking-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, website, formLoadedAt, turnstileToken }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Submission failed')
      setStatus('success')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div className="border border-kc-gray-border bg-white p-12 text-center">
        <p className="font-display text-3xl font-light text-kc-black mb-4">Inquiry received.</p>
        <p className="font-sans text-sm text-kc-gray-mid leading-relaxed max-w-sm mx-auto">
          Thank you for reaching out. We will review your inquiry and respond within 2 business days.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'name')}{isRequired(config, 'name') ? ' *' : ''}</label>
          <input required value={form.name} onChange={set('name')} className="input-field" placeholder="Full name" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'organisation')}{isRequired(config, 'organisation') ? ' *' : ''}</label>
          <input required value={form.organisation} onChange={set('organisation')} className="input-field" placeholder="Company / organisation" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'eventName')}{isRequired(config, 'eventName') ? ' *' : ''}</label>
          <input required value={form.eventName} onChange={set('eventName')} className="input-field" placeholder="Name of event or conference" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'eventDate')}{isRequired(config, 'eventDate') ? ' *' : ''}</label>
          <input type="date" value={form.eventDate} onChange={set('eventDate')} className="input-field" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'location')}{isRequired(config, 'location') ? ' *' : ''}</label>
          <input value={form.location} onChange={set('location')} className="input-field" placeholder="City, Province / Virtual" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'audienceSize')}{isRequired(config, 'audienceSize') ? ' *' : ''}</label>
          <input value={form.audienceSize} onChange={set('audienceSize')} className="input-field" placeholder="e.g. 200 attendees" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'format')}{isRequired(config, 'format') ? ' *' : ''}</label>
          <select required={isRequired(config, 'format')} value={form.format} onChange={set('format')} className="input-field">
            <option value="">Select format</option>
            {optionsFor(config, 'format').map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'topicInterest')}{isRequired(config, 'topicInterest') ? ' *' : ''}</label>
          <select value={form.topicInterest} onChange={set('topicInterest')} className="input-field">
            <option value="">Select a topic</option>
            {optionsFor(config, 'topicInterest').map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'budget')}{isRequired(config, 'budget') ? ' *' : ''}</label>
        <input value={form.budget} onChange={set('budget')} className="input-field" placeholder="e.g. $3,000–$5,000, or TBD" />
      </div>
      <div>
        <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">{labelFor(config, 'notes')}{isRequired(config, 'notes') ? ' *' : ''}</label>
        <textarea value={form.notes} onChange={set('notes')} rows={4} className="input-field resize-none" placeholder="Event context, audience profile, specific session goals, logistics, etc." />
      </div>
      {status === 'error' && (
        <p className="font-sans text-xs text-kc-red">{errorMsg}</p>
      )}
      {/* Honeypot — hidden from real users; bots that fill it are silently dropped */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-5000px' }}>
        <input type="text" tabIndex={-1} autoComplete="off"
          value={website} onChange={e => setWebsite(e.target.value)} />
      </div>
      <Turnstile onVerify={setTurnstileToken} />

      <button type="submit" disabled={status === 'loading'} className="btn-brown w-full justify-center">
        {status === 'loading' ? 'Submitting...' : 'Submit Speaking Inquiry'}
      </button>
    </form>
  )
}
