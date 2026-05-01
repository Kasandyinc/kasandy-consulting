'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  dateStr: string
  timeStr?: string
  action: 'block' | 'unblock' | 'blockDay' | 'unblockDay'
  label: string
  status?: 'available' | 'booked' | 'blocked'
  variant: 'slot' | 'day'
}

export default function BookingActions({ dateStr, timeStr, action, label, status, variant }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isBooked   = status === 'booked'
  const isBlocked  = status === 'blocked'

  const handleClick = async () => {
    if (isBooked) return // can't modify booked slots
    setLoading(true)
    try {
      await fetch('/api/bookings/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, date: dateStr, time: timeStr }),
      })
      router.refresh()
    } catch {
      alert('Failed to update slot.')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'day') {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        className="text-xs px-3 py-1.5 border border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900 transition-colors disabled:opacity-50"
      >
        {loading ? '…' : label}
      </button>
    )
  }

  // slot variant
  return (
    <button
      onClick={handleClick}
      disabled={isBooked || loading}
      title={isBooked ? 'Booked — cannot modify' : isBlocked ? 'Click to unblock' : 'Click to block'}
      className={`
        text-xs px-2.5 py-1.5 border transition-colors font-mono
        ${isBooked
          ? 'border-green-300 bg-green-50 text-green-700 cursor-not-allowed'
          : isBlocked
            ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
            : 'border-gray-200 text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700'
        }
        ${loading ? 'opacity-50' : ''}
      `}
    >
      {loading ? '…' : label}
      {isBooked && ' ✓'}
      {isBlocked && ' ✗'}
    </button>
  )
}
