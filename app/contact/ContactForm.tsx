'use client'

import { useState } from 'react'

const audienceTypes = [
  { value: 'entrepreneur', label: 'Entrepreneur / Founder' },
  { value: 'government', label: 'Government / Public Sector' },
  { value: 'nonprofit', label: 'Non-Profit Organization' },
  { value: 'international', label: 'International Business' },
  { value: 'other', label: 'Other' },
]

const referralOptions = [
  'Google / Search',
  'LinkedIn',
  'Instagram',
  'Referral from a colleague',
  'BEBC Society',
  'Procurement Assistance Canada',
  'Event / Conference',
  'Media / Press',
  'Other',
]

export default function ContactForm() {
  const [form, setForm] = useState({
    name: '',
    organisation: '',
    email: '',
    phone: '',
    audienceType: '',
    message: '',
    referral: '',
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
      const res = await fetch('/api/contact', {
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
      <div className="border border-kc-gray-border bg-kc-gray-light p-12 text-center">
        <p className="font-display text-3xl font-light text-kc-black mb-4">Message received.</p>
        <p className="font-sans text-sm text-kc-gray-mid leading-relaxed max-w-sm mx-auto">
          Thank you for reaching out. We'll be in touch within 2 business days.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Full Name *</label>
          <input required value={form.name} onChange={set('name')} className="input-field" placeholder="Your full name" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Organisation</label>
          <input value={form.organisation} onChange={set('organisation')} className="input-field" placeholder="Company / organisation" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Email *</label>
          <input required type="email" value={form.email} onChange={set('email')} className="input-field" placeholder="your@email.com" />
        </div>
        <div>
          <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Phone (optional)</label>
          <input type="tel" value={form.phone} onChange={set('phone')} className="input-field" placeholder="+1 (604) 000-0000" />
        </div>
      </div>
      <div>
        <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">I am a... *</label>
        <select required value={form.audienceType} onChange={set('audienceType')} className="input-field">
          <option value="">Select your context</option>
          {audienceTypes.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
      </div>
      <div>
        <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">Message *</label>
        <textarea required value={form.message} onChange={set('message')} rows={5} className="input-field resize-none" placeholder="Tell us about your goals, your organisation, and what you're looking for help with." />
      </div>
      <div>
        <label className="font-sans text-xs tracking-wide uppercase text-kc-gray-mid block mb-2">How did you hear about us?</label>
        <select value={form.referral} onChange={set('referral')} className="input-field">
          <option value="">Select an option</option>
          {referralOptions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {status === 'error' && (
        <p className="font-sans text-xs text-kc-red">{errorMsg}</p>
      )}
      <button type="submit" disabled={status === 'loading'} className="btn-brown w-full justify-center">
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
