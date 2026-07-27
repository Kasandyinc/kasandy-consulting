import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isOperator } from '@/lib/engine/operators'
import SignOutButton from './SignOutButton'
import NavRail from './NavRail'

export const dynamic = 'force-dynamic'

/**
 * Shell for every authenticated hub screen (the login page sits outside this group
 * so it renders bare). Auth is checked here as well as in middleware — the Engine is
 * never rendered to a non-operator.
 */
export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isOperator(user?.email)) redirect('/login')

  const initials = (user?.email ?? '?').slice(0, 2).toUpperCase()

  return (
    <div className="app">
      <aside className="rail">
        <div className="brand">
          <div className="logo">KC</div>
          <div>
            <div className="bt">Kasandy Consulting</div>
            <div className="bs">Operations Platform</div>
          </div>
        </div>
        <NavRail />
        <div className="railfoot">
          Phase 1 · Outreach is live on Supabase + Resend.
          <br />
          Other modules arrive in later phases.
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <Link href="/" className="pgtitle" style={{ color: 'var(--ink)' }}>
            The Engine
          </Link>
          <div className="topspacer" />
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {user?.email}
          </span>
          <div className="avatar">{initials}</div>
          <SignOutButton />
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  )
}
