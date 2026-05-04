'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const sections = [
  {
    group: 'Inbox',
    items: [
      { href: '/admin/submissions', label: 'Submissions Inbox', desc: 'Contact inquiries, speaking bookings, Kenya waitlist registrations' },
      { href: '/admin/subscribers', label: 'Subscribers & Leads', desc: 'Newsletter subscribers and resource download leads — export CSV' },
      { href: '/admin/bookings', label: 'Discovery Calls', desc: 'View upcoming calls, block slots, manage availability' },
    ],
  },
  {
    group: 'Content',
    items: [
      { href: '/admin/speaking', label: 'Speaking Media', desc: 'Photos, videos, and speaking quotes' },
      { href: '/admin/testimonials', label: 'Testimonials', desc: 'Approve, feature, and manage reviews' },
      { href: '/admin/articles', label: 'Articles', desc: 'Manage and publish blog content' },
      { href: '/admin/heroes', label: 'Page Heroes', desc: 'Edit hero titles and images for every page' },
    ],
  },
  {
    group: 'Pages',
    items: [
      { href: '/admin/press', label: 'Press & Media', desc: 'Add, edit, and remove press coverage. Toggle featured items.' },
      { href: '/admin/work', label: 'Work & Case Studies', desc: 'Edit impact stats, partner list, and case studies.' },
      { href: '/admin/programs', label: 'Programs & Pricing', desc: 'Edit program descriptions and includes for Entrepreneurs, Non-Profits, and Government pages.' },
      { href: '/admin/kenya-seminar', label: 'Kenya Seminar', desc: 'Update seminar dates, pricing, and registration status.' },
      { href: '/admin/about', label: 'About Page', desc: 'Edit credentials sidebar and bio content.' },
    ],
  },
  {
    group: 'Resources',
    items: [
      { href: '/admin/downloads', label: 'Downloads Manager', desc: 'Link PDF files to lead magnets — go live when ready' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { href: '/admin/settings', label: 'Site Settings', desc: 'Tagline, CTAs, social links, announcement bar, booking URL' },
    ],
  },
]

export default function AdminDashboard() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Kasandy Consulting — Admin</h1>
        <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">Sign Out</button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {sections.map(section => (
          <div key={section.group}>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-3">{section.group}</p>
            <div className="grid sm:grid-cols-3 gap-3">
              {section.items.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block bg-white border border-gray-200 p-5 hover:border-gray-400 transition-colors"
                >
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">{item.label}</h2>
                  <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
