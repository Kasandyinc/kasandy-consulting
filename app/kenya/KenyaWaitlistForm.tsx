'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'

export default function KenyaWaitlistForm() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', country: '', business: '', program: '', goals: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/kenya-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-10">
        <CheckCircle size={36} className="mx-auto mb-4 text-kc-gold" />
        <h3 className="font-display text-2xl font-light text-white mb-3">You&apos;re on the list.</h3>
        <p className="font-sans text-sm text-white/70 max-w-sm mx-auto">
          Check your inbox for a confirmation. You&apos;ll be among the first to hear when the next bootcamp is confirmed — with priority registration access.
        </p>
      </div>
    )
  }

  const inputClass = "w-full bg-white/10 border border-white/20 px-4 py-2.5 font-sans text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-kc-gold transition-colors"
  const labelClass = "block font-sans text-[11px] tracking-widest uppercase text-white/50 mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Full Name <span className="text-kc-gold">*</span></label>
          <input type="text" required value={formData.name} onChange={set('name')}
            className={inputClass} placeholder="Your name" />
        </div>
        <div>
          <label className={labelClass}>Email Address <span className="text-kc-gold">*</span></label>
          <input type="email" required value={formData.email} onChange={set('email')}
            className={inputClass} placeholder="you@example.com" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Phone / WhatsApp <span className="text-kc-gold">*</span></label>
          <input type="tel" required value={formData.phone} onChange={set('phone')}
            className={inputClass} placeholder="+254 7XX XXX XXX" />
        </div>
        <div>
          <label className={labelClass}>Country / City <span className="text-kc-gold">*</span></label>
          <input type="text" required value={formData.country} onChange={set('country')}
            className={inputClass} placeholder="e.g. Nairobi, Kenya" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Business / Organisation <span className="text-kc-gold">*</span></label>
        <input type="text" required value={formData.business} onChange={set('business')}
          className={inputClass} placeholder="Your business name & sector" />
      </div>

      <div>
        <label className={labelClass}>Which program interests you?</label>
        <select value={formData.program} onChange={set('program')} className={inputClass + " cursor-pointer"}>
          <option value="" disabled>Select a program…</option>
          <option value="bootcamp">2-Day Bootcamp (Nairobi or virtual)</option>
          <option value="accelerate">Accelerate — 90-Day Coaching</option>
          <option value="market-entry">Market Entry — 6-Month Program</option>
          <option value="unsure">Not sure yet</option>
        </select>
      </div>

      <div>
        <label className={labelClass}>What are you hoping to achieve? <span className="text-white/30">(optional)</span></label>
        <textarea rows={2} value={formData.goals} onChange={set('goals')}
          className={inputClass + " resize-none"}
          placeholder="Brief description of your goals for the Canadian market…" />
      </div>

      {error && <p className="text-sm text-red-400 font-sans">{error}</p>}

      <button type="submit" disabled={submitting}
        className="w-full py-3.5 font-sans text-xs tracking-widest uppercase font-bold text-kc-black transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ background: submitting ? '#a07a22' : '#B8922A' }}>
        {submitting ? 'Registering…' : 'Join the Waitlist →'}
      </button>

      <p className="text-center font-sans text-[11px] text-white/40">
        You&apos;ll receive priority access when the next bootcamp is confirmed. No spam.
      </p>
    </form>
  )
}
