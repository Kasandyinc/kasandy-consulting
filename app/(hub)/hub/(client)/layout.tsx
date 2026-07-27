/**
 * The shell a client sees.
 *
 * Deliberately not the operator layout: no nav rail, no pipeline, nothing about other
 * organisations. Someone opening an intake form or a proposal sees their document and
 * KC's name, and no evidence that a wider system exists.
 */
export default function ClientDocLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header
        style={{
          background: 'var(--ink)',
          padding: '16px 26px',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            border: '1.5px solid #c9a06a',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--serif)',
            fontWeight: 700,
            color: '#e8d9c4',
            fontSize: 14,
          }}
        >
          KC
        </span>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Kasandy Consulting</span>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 22px 64px' }}>{children}</main>

      <footer
        style={{
          textAlign: 'center',
          padding: '0 22px 40px',
          color: 'var(--muted)',
          fontSize: 11.5,
          fontFamily: 'var(--mono)',
        }}
      >
        Kasandy Consulting · 7244 Inlet Drive, Burnaby, BC V5A 1C4
      </footer>
    </div>
  )
}
