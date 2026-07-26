'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type ContactEntry = { id: string; name: string; email: string; organisation: string; phone: string; audienceType: string; message: string; referral: string; createdAt: string }
type SpeakingEntry = { id: string; name: string; organisation: string; eventName: string; eventDate: string; location: string; audienceSize: string; format: string; topicInterest: string; budget: string; notes: string; createdAt: string }
type KenyaEntry = { name: string; email: string; phone: string; country: string; business: string; program: string; goals: string; createdAt: string }

type Tab = 'contact' | 'speaking' | 'kenya'

function fmt(iso: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-CA', { timeZone: 'America/Vancouver', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SubmissionsPage() {
  const [tab, setTab] = useState<Tab>('contact')
  const [data, setData] = useState<{ contact: ContactEntry[]; speaking: SpeakingEntry[]; kenya: KenyaEntry[] } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/submissions').then(r => r.json()).then(setData)
  }, [])

  const tabs: { key: Tab; label: string; count: number }[] = data ? [
    { key: 'contact', label: 'Contact Inquiries', count: data.contact.length },
    { key: 'speaking', label: 'Speaking Inquiries', count: data.speaking.length },
    { key: 'kenya', label: 'Kenya Waitlist', count: data.kenya.length },
  ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-900">← Dashboard</Link>
          <h1 className="text-base font-semibold text-gray-900">Submissions Inbox</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {!data && <p className="text-sm text-gray-400">Loading…</p>}

        {data && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-8 border-b border-gray-200">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  {t.label}
                  <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Contact */}
            {tab === 'contact' && (
              <div className="space-y-3">
                {data.contact.length === 0 && <p className="text-sm text-gray-400">No contact submissions yet.</p>}
                {data.contact.map((c, i) => (
                  <div key={c.id || i} className="bg-white border border-gray-200">
                    <button className="w-full text-left px-5 py-4 flex items-center justify-between gap-4" onClick={() => setExpanded(expanded === `c${i}` ? null : `c${i}`)}>
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-medium text-sm text-gray-900 shrink-0">{c.name}</span>
                        <span className="text-sm text-gray-500 truncate">{c.email}</span>
                        {c.audienceType && <span className="text-xs text-gray-400 hidden sm:block">{c.audienceType}</span>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(c.createdAt)}</span>
                    </button>
                    {expanded === `c${i}` && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {[['Email', c.email], ['Organisation', c.organisation], ['Phone', c.phone], ['Audience', c.audienceType], ['Referral', c.referral]].map(([k, v]) => v ? (
                            <div key={k}><span className="text-gray-400 uppercase tracking-wide text-[10px]">{k}</span><p className="text-gray-700 mt-0.5">{v}</p></div>
                          ) : null)}
                        </div>
                        <div>
                          <span className="text-gray-400 uppercase tracking-wide text-[10px]">Message</span>
                          <p className="text-gray-700 mt-1 whitespace-pre-wrap leading-relaxed">{c.message}</p>
                        </div>
                        <a href={`mailto:${c.email}?subject=Re: Your enquiry`} className="inline-block mt-2 text-xs bg-gray-900 text-white px-4 py-2 hover:bg-gray-700 transition-colors">Reply via Email →</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Speaking */}
            {tab === 'speaking' && (
              <div className="space-y-3">
                {data.speaking.length === 0 && <p className="text-sm text-gray-400">No speaking inquiries yet.</p>}
                {data.speaking.map((s, i) => (
                  <div key={s.id || i} className="bg-white border border-gray-200">
                    <button className="w-full text-left px-5 py-4 flex items-center justify-between gap-4" onClick={() => setExpanded(expanded === `s${i}` ? null : `s${i}`)}>
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-medium text-sm text-gray-900 shrink-0">{s.eventName}</span>
                        <span className="text-sm text-gray-500 truncate">{s.name} · {s.organisation}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(s.createdAt)}</span>
                    </button>
                    {expanded === `s${i}` && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {[['Contact', s.name], ['Organisation', s.organisation], ['Event Date', s.eventDate], ['Location', s.location], ['Audience Size', s.audienceSize], ['Format', s.format], ['Topic', s.topicInterest], ['Budget', s.budget]].map(([k, v]) => v ? (
                            <div key={k}><span className="text-gray-400 uppercase tracking-wide text-[10px]">{k}</span><p className="text-gray-700 mt-0.5">{v}</p></div>
                          ) : null)}
                        </div>
                        {s.notes && <div><span className="text-gray-400 uppercase tracking-wide text-[10px]">Notes</span><p className="text-gray-700 mt-1 whitespace-pre-wrap">{s.notes}</p></div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Kenya */}
            {tab === 'kenya' && (
              <div className="space-y-3">
                {data.kenya.length === 0 && <p className="text-sm text-gray-400">No Kenya waitlist registrations yet.</p>}
                {data.kenya.map((k, i) => (
                  <div key={i} className="bg-white border border-gray-200">
                    <button className="w-full text-left px-5 py-4 flex items-center justify-between gap-4" onClick={() => setExpanded(expanded === `k${i}` ? null : `k${i}`)}>
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="font-medium text-sm text-gray-900 shrink-0">{k.name}</span>
                        <span className="text-sm text-gray-500 truncate">{k.email} · {k.country}</span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{fmt(k.createdAt)}</span>
                    </button>
                    {expanded === `k${i}` && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {[['Email', k.email], ['Phone / WhatsApp', k.phone], ['Country / City', k.country], ['Business', k.business], ['Program Interest', k.program]].map(([label, val]) => val ? (
                            <div key={label}><span className="text-gray-400 uppercase tracking-wide text-[10px]">{label}</span><p className="text-gray-700 mt-0.5">{val}</p></div>
                          ) : null)}
                        </div>
                        {k.goals && <div><span className="text-gray-400 uppercase tracking-wide text-[10px]">Goals</span><p className="text-gray-700 mt-1 whitespace-pre-wrap">{k.goals}</p></div>}
                        <a href={`mailto:${k.email}`} className="inline-block mt-2 text-xs bg-gray-900 text-white px-4 py-2 hover:bg-gray-700 transition-colors">Reply via Email →</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
