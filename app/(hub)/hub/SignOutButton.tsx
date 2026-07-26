'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    await createClient().auth.signOut()
    window.location.assign('/login')
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--ox)',
        background: 'transparent',
        border: '1px solid var(--line)',
        padding: '6px 12px',
        cursor: busy ? 'default' : 'pointer',
      }}
    >
      {busy ? '…' : 'Sign out'}
    </button>
  )
}
