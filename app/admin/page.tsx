'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Kasandy Consulting — Admin</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign Out
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-sm text-gray-500 mb-10">Select a section to manage.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/admin/speaking"
            className="block bg-white border border-gray-200 p-6 hover:border-gray-400 transition-colors"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-1">Speaking Media</h2>
            <p className="text-xs text-gray-500">Photos, videos, and speaking quotes</p>
          </Link>
          <Link
            href="/admin/testimonials"
            className="block bg-white border border-gray-200 p-6 hover:border-gray-400 transition-colors"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-1">Testimonials</h2>
            <p className="text-xs text-gray-500">Approve, feature, and manage reviews</p>
          </Link>
          <Link
            href="/admin/articles"
            className="block bg-white border border-gray-200 p-6 hover:border-gray-400 transition-colors"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-1">Articles</h2>
            <p className="text-xs text-gray-500">Manage and publish blog content</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
