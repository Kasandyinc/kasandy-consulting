'use client'

import { useState } from 'react'

const formats = [
  'Keynote (45–60 min)',
  'Panel',
  'Workshop / Masterclass (2–4 hr)',
  'Corporate Lunch & Learn',
  'Conference Breakout',
  'University / Academic Lecture',
  'Emcee / Host',
  'Other',
]

const topicOptions = [
  'The Procurement Opportunity Nobody Talks About',
  'Supplier Diversity as Economic Strategy',
  'From Founder to Procurement-Ready — What They Don\'t Teach You',
  'Building for Belonging — Equity-Centred Leadership in Practice',
  'The Global Opportunity — African Businesses and the Canadian Market',
  'The Non-Profit Trap — Why Good Missions Fail and How to Break the Cycle',
  'Custom / Open to suggestions',
]

export default function SpeakingInquiryForm() {
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
        body: JSON.stringify(form),
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
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Your Name *</label>
          <input required value={form.name} onChange={set('name')} className="input-field" placeholder="Full name" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Organisation *</label>
          <input required value={form.organisation} onChange={set('organisation')} className="input-field" placeholder="Company / organisation" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Event Name *</label>
          <input required value={form.eventName} onChange={set('eventName')} className="input-field" placeholder="Name of event or conference" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Event Date</label>
          <input type="date" value={form.eventDate} onChange={set('eventDate')} className="input-field" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Location</label>
          <input value={form.location} onChange={set('location')} className="input-field" placeholder="City, Province / Virtual" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Audience Size</label>
          <input value={form.audienceSize} onChange={set('audienceSize')} className="input-field" placeholder="e.g. 200 attendees" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Format *</label>
          <select required value={form.format} onChange={set('format')} className="input-field">
            <option value="">Select format</option>
            {formats.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Topic Interest</label>
          <select value={form.topicInterest} onChange={set('topicInterest')} className="input-field">
            <option value="">Select a topic</option>
            {topicOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Budget / Honorarium Range</label>
        <input value={form.budget} onChange={set('budget')} className="input-field" placeholder="e.g. $3,000–$5,000, or TBD" />
      </div>
      <div>
        <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Additional Notes</label>
        <textarea value={form.notes} onChange={set('notes')} rows={4} className="input-field resize-none" placeholder="Event context, audience profile, specific session goals, logistics, etc." />
      </div>
      {status === 'error' && (
        <p className="font-sans text-xs text-kc-red">{errorMsg}</p>
      )}
      <button type="submit" disabled={status === 'loading'} className="btn-brown w-full justify-center">
        {status === 'loading' ? 'Submitting...' : 'Submit Speaking Inquiry'}
      </button>
    </form>
  )
}
