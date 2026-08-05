'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCampaign, sendCampaign, movePost, saveSocialPost, deleteSocialPost } from './actions'
import { campaignBlockers, segmentLabel, type SegmentDef } from '@/lib/engine/campaigns'

const field: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

type Campaign = {
  id: string
  subject: string
  body_md: string
  segment: string
  status: string
  sent_at: string | null
  sent_count: number
  failed_count: number
  suppressed_count: number
  created_at: string
}

type Post = {
  id: string
  title: string
  slug: string
  kind: string
  stage: string
  status: string
  author: string | null
}

type Social = {
  id: string
  body: string
  status: string
  scheduled_for: string | null
  posted_at: string | null
  url: string | null
  reactions: number | null
  comments: number | null
}

const STAGES = ['idea', 'drafting', 'review', 'published'] as const
const STAGE_LABEL: Record<string, string> = {
  idea: 'Idea',
  drafting: 'Drafting',
  review: 'Review',
  published: 'Published',
}

function when(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function MarketingPanels({
  campaigns,
  posts,
  social,
  segments,
  counts,
  ready,
}: {
  campaigns: Campaign[]
  posts: Post[]
  social: Social[]
  segments: SegmentDef[]
  counts: Record<string, number>
  ready: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [tab, setTab] = useState<'newsletter' | 'blog' | 'linkedin' | 'calendar'>('newsletter')
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)

  // ── Newsletter composer ───────────────────────────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [c, setC] = useState({ subject: '', bodyMd: '', segment: 'subscribers' })
  const [confirming, setConfirming] = useState<string | null>(null)

  const audience = counts[c.segment] ?? 0
  const blockers = campaignBlockers(c, {
    mailingAddress: ready ? 'set' : null,
    sendingAddress: ready ? 'set' : null,
    recipientCount: audience,
  })

  function openCampaign(row: Campaign | null) {
    setEditing(row)
    setC(
      row
        ? { subject: row.subject, bodyMd: row.body_md, segment: row.segment }
        : { subject: '', bodyMd: '', segment: 'subscribers' },
    )
    setComposerOpen(true)
    setConfirming(null)
    setFlash(null)
  }

  function closeCampaign() {
    setComposerOpen(false)
    setEditing(null)
    setConfirming(null)
    setC({ subject: '', bodyMd: '', segment: 'subscribers' })
  }

  function persist(then?: (id: string) => void) {
    start(async () => {
      const res = await saveCampaign({ id: editing?.id, ...c })
      if (!res.ok) return setFlash({ ok: false, text: res.error ?? 'Could not save.' })
      setFlash({ ok: true, text: 'Saved.' })
      router.refresh()
      if (then && res.id) then(res.id)
    })
  }

  function reallySend(id: string) {
    start(async () => {
      const res = await sendCampaign(id)
      setConfirming(null)
      if (!res.ok) return setFlash({ ok: false, text: res.error ?? 'The send was refused.' })
      setFlash({
        ok: true,
        text: `Sent to ${res.sent}. ${res.failed ? `${res.failed} failed. ` : ''}${
          res.suppressed ? `${res.suppressed} held back by the suppression list.` : ''
        }`,
      })
      router.refresh()
    })
  }

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  const [socialOpen, setSocialOpen] = useState(false)
  const [post, setPost] = useState<Social | null>(null)
  const [p, setP] = useState({ body: '', status: 'idea', scheduledFor: '', url: '', reactions: '', comments: '' })

  function closeSocial() {
    setSocialOpen(false)
    setPost(null)
    setP({ body: '', status: 'idea', scheduledFor: '', url: '', reactions: '', comments: '' })
  }

  function openSocial(row: Social | null) {
    setPost(row)
    setSocialOpen(true)
    setP(
      row
        ? {
            body: row.body,
            status: row.status,
            scheduledFor: row.scheduled_for ? row.scheduled_for.slice(0, 16) : '',
            url: row.url ?? '',
            reactions: row.reactions?.toString() ?? '',
            comments: row.comments?.toString() ?? '',
          }
        : { body: '', status: 'idea', scheduledFor: '', url: '', reactions: '', comments: '' },
    )
    setFlash(null)
  }

  return (
    <>
      {flash && (
        <div className={`note ${flash.ok ? 'good' : 'bad'}`} style={{ marginTop: 16 }}>
          {flash.text}
        </div>
      )}

      <div className="tabs" style={{ marginTop: 20 }}>
        {(['newsletter', 'blog', 'linkedin', 'calendar'] as const).map((t) => (
          <button key={t} className={`tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
            {t === 'linkedin' ? 'LinkedIn' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ─── NEWSLETTER ─────────────────────────────────────────────────── */}
      {tab === 'newsletter' && (
        <>
          <div className="grid g3" style={{ marginBottom: 16 }}>
            {segments.slice(0, 3).map((s) => (
              <div className="card" key={s.id}>
                <div className="card-b">
                  <div style={{ fontSize: 26, fontFamily: 'var(--serif)' }}>{counts[s.id] ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {!composerOpen && (
            <div className="card">
              <div className="card-h between">
                <h3>Campaigns</h3>
                <button className="btn sm primary" onClick={() => openCampaign(null)}>
                  New campaign
                </button>
              </div>
              {campaigns.length === 0 ? (
                <div className="card-b" style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Nothing sent yet. A campaign mails a live segment — the list is counted at
                  the moment you send, not when you wrote it.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Sent</th>
                      <th>Delivered</th>
                      <th>Held back</th>
                      <th>Segment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => openCampaign(row)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="tname">{row.subject || 'Untitled'}</td>
                        <td>
                          <span className={`tag ${row.status === 'sent' ? 'good' : row.status === 'failed' ? 'bad' : 'mut'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="tsub">{when(row.sent_at)}</td>
                        <td>{row.status === 'sent' ? row.sent_count : '—'}</td>
                        <td className="tsub">{row.status === 'sent' ? row.suppressed_count : '—'}</td>
                        <td className="tsub">{segmentLabel(row.segment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {composerOpen && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-h between">
                <h3>{editing ? (editing.status === 'sent' ? 'Sent campaign' : 'Edit campaign') : 'New campaign'}</h3>
                <button className="btn sm" onClick={closeCampaign}>
                  Close
                </button>
              </div>
              <div className="card-b" style={{ display: 'grid', gap: 12 }}>
                {editing?.status === 'sending' && (
                  <div className="note">
                    <b>This campaign is part-sent.</b> {editing.sent_count} have received it.
                    Continuing picks up exactly where it stopped — the recipient list is
                    fixed, so nobody gets a second copy.
                    <div style={{ marginTop: 10 }}>
                      <button
                        className="btn primary"
                        disabled={pending}
                        onClick={() => reallySend(editing.id)}
                      >
                        {pending ? 'Sending…' : 'Continue sending'}
                      </button>
                    </div>
                  </div>
                )}

                {editing?.status === 'sent' && (
                  <div className="note">
                    This went out on {when(editing.sent_at)} to {editing.sent_count} people. It is
                    locked — what was received cannot be edited afterwards. Copy it into a new
                    campaign to reuse the wording.
                  </div>
                )}

                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Subject</label>
                <input
                  style={field}
                  value={c.subject}
                  disabled={editing?.status === 'sent' || editing?.status === 'sending'}
                  onChange={(e) => setC({ ...c, subject: e.target.value })}
                  placeholder="July update: why membership bodies are the quiet win"
                />

                <label style={{ fontSize: 12, color: 'var(--muted)' }}>Audience</label>
                <select
                  style={field}
                  value={c.segment}
                  disabled={editing?.status === 'sent' || editing?.status === 'sending'}
                  onChange={(e) => setC({ ...c, segment: e.target.value })}
                >
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} — {counts[s.id] ?? 0}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -6 }}>
                  {segments.find((s) => s.id === c.segment)?.describes}
                </div>

                <label style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Body — <code>{'{{first_name}}'}</code> is replaced per person
                </label>
                <textarea
                  style={{ ...field, minHeight: 220, fontFamily: 'var(--mono)', lineHeight: 1.6 }}
                  value={c.bodyMd}
                  disabled={editing?.status === 'sent' || editing?.status === 'sending'}
                  onChange={(e) => setC({ ...c, bodyMd: e.target.value })}
                  placeholder={'Hi {{first_name}},\n\n…'}
                />

                {(!editing || editing.status === 'draft') && (
                  <>
                    {blockers.length > 0 && (
                      <div className="note bad">
                        <b>Not ready to send:</b>
                        <ul style={{ margin: '6px 0 0 18px' }}>
                          {blockers.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="row" style={{ gap: 8 }}>
                      <button className="btn" disabled={pending} onClick={() => persist()}>
                        {pending ? 'Saving…' : 'Save draft'}
                      </button>
                      <button
                        className="btn primary"
                        disabled={pending || blockers.length > 0}
                        onClick={() => persist((id) => setConfirming(id))}
                      >
                        Send to {audience}
                      </button>
                    </div>
                  </>
                )}

                {confirming && (
                  <div className="note">
                    <b>This sends real email to {audience} people and cannot be undone.</b>
                    <div className="row" style={{ gap: 8, marginTop: 10 }}>
                      <button className="btn primary" disabled={pending} onClick={() => reallySend(confirming)}>
                        {pending ? 'Sending…' : 'Yes, send it'}
                      </button>
                      <button className="btn" onClick={() => setConfirming(null)}>
                        Not yet
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!composerOpen && (
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
              Opens and clicks are not shown because nothing measures them. What is
              recorded is what the platform actually knows: delivered, failed, or held
              back by the suppression list.
            </div>
          )}
        </>
      )}

      {/* ─── BLOG BOARD ─────────────────────────────────────────────────── */}
      {tab === 'blog' && (
        <>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {STAGES.map((stage) => {
              const cards = posts.filter((p) => p.stage === stage)
              return (
                <div className="card" key={stage}>
                  <div className="card-h between">
                    <h3 style={{ fontSize: 13 }}>{STAGE_LABEL[stage]}</h3>
                    <span className="tag mut">{cards.length}</span>
                  </div>
                  <div className="card-b" style={{ display: 'grid', gap: 8, padding: 10 }}>
                    {cards.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>Nothing here.</div>
                    )}
                    {cards.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          border: '1px solid var(--line)',
                          borderRadius: 8,
                          padding: '9px 10px',
                          background: '#fff',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{p.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                          {p.kind} · {p.author ?? 'Jackee'}
                        </div>
                        <div className="row" style={{ gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {STAGES.filter((s) => s !== stage).map((s) => (
                            <button
                              key={s}
                              className="btn sm"
                              disabled={pending}
                              onClick={() =>
                                start(async () => {
                                  const res = await movePost({ id: p.id, stage: s })
                                  if (!res.ok) setFlash({ ok: false, text: res.error ?? 'Could not move it.' })
                                  router.refresh()
                                })
                              }
                            >
                              → {STAGE_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
            Moving a card to Published puts the article on the website, and moving it back
            takes it down — the board and the site are the same fact, not two records that
            can disagree. Write the article itself in <b>Website CMS → Content</b>.
          </div>
        </>
      )}

      {/* ─── LINKEDIN ───────────────────────────────────────────────────── */}
      {tab === 'linkedin' && (
        <>
          <div className="note" style={{ marginBottom: 14 }}>
            LinkedIn has no public posting API — access is limited to approved partners — so
            this plans and records; it does not post. Write here, get the schedule in your
            calendar, copy it across when it is due, then mark it posted.
          </div>

          <div className="card">
            <div className="card-h between">
              <h3>Posts</h3>
              <button className="btn sm primary" onClick={() => openSocial(null)}>
                New post
              </button>
            </div>
            <div className="card-b" style={{ display: 'grid', gap: 8 }}>
              {social.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nothing planned yet.</div>
              )}
              {social.map((s) => (
                <div
                  key={s.id}
                  style={{
                    border: '1px solid var(--line)',
                    borderRadius: 8,
                    padding: '10px 12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => openSocial(s)}
                >
                  <div className="row between center">
                    <span className={`tag ${s.status === 'posted' ? 'good' : s.status === 'scheduled' ? 'warn' : 'mut'}`}>
                      {s.status}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {s.status === 'posted' ? when(s.posted_at) : when(s.scheduled_for)}
                      {s.reactions !== null && ` · ${s.reactions} reactions`}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                    {s.body.slice(0, 160)}
                    {s.body.length > 160 ? '…' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {socialOpen && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-h between">
                <h3>{post ? 'Edit post' : 'New post'}</h3>
                <button className="btn sm" onClick={closeSocial}>
                  Close
                </button>
              </div>
              <div className="card-b" style={{ display: 'grid', gap: 12 }}>
                <textarea
                  style={{ ...field, minHeight: 140, lineHeight: 1.6 }}
                  value={p.body}
                  onChange={(e) => setP({ ...p, body: e.target.value })}
                  placeholder="What are you saying, and to whom?"
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: -8 }}>
                  {p.body.length} characters
                  {p.body.length > 3000 && ' — LinkedIn cuts posts off around 3,000'}
                </div>

                <div className="grid g2" style={{ gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--muted)' }}>Status</label>
                    <select style={field} value={p.status} onChange={(e) => setP({ ...p, status: e.target.value })}>
                      <option value="idea">Idea</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="posted">Posted</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--muted)' }}>Due</label>
                    <input
                      type="datetime-local"
                      style={field}
                      value={p.scheduledFor}
                      onChange={(e) => setP({ ...p, scheduledFor: e.target.value })}
                    />
                  </div>
                </div>

                {p.status === 'posted' && (
                  <div className="grid g3" style={{ gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--muted)' }}>Link</label>
                      <input style={field} value={p.url} onChange={(e) => setP({ ...p, url: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--muted)' }}>Reactions</label>
                      <input style={field} value={p.reactions} onChange={(e) => setP({ ...p, reactions: e.target.value })} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: 'var(--muted)' }}>Comments</label>
                      <input style={field} value={p.comments} onChange={(e) => setP({ ...p, comments: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="row" style={{ gap: 8 }}>
                  <button
                    className="btn primary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await saveSocialPost({ id: post?.id, ...p })
                        if (!res.ok) return setFlash({ ok: false, text: res.error ?? 'Could not save.' })
                        setFlash({ ok: true, text: 'Saved.' })
                        closeSocial()
                        router.refresh()
                      })
                    }
                  >
                    {pending ? 'Saving…' : 'Save'}
                  </button>
                  {p.body.trim() && (
                    <button
                      className="btn"
                      onClick={() => {
                        void navigator.clipboard?.writeText(p.body)
                        setFlash({ ok: true, text: 'Copied — paste it into LinkedIn.' })
                      }}
                    >
                      Copy text
                    </button>
                  )}
                  {post && (
                    <button
                      className="btn"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          await deleteSocialPost(post.id)
                          closeSocial()
                          router.refresh()
                        })
                      }
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── CALENDAR ───────────────────────────────────────────────────── */}
      {tab === 'calendar' && (
        <div className="card">
          <div className="card-h">
            <h3>What is coming</h3>
          </div>
          <div className="card-b" style={{ display: 'grid', gap: 8 }}>
            {(() => {
              const items = [
                ...social
                  .filter((s) => s.scheduled_for && s.status !== 'posted')
                  .map((s) => ({ at: s.scheduled_for!, what: `LinkedIn — ${s.body.slice(0, 60)}`, kind: 'LinkedIn' })),
                ...campaigns
                  .filter((c) => c.status === 'sent' && c.sent_at)
                  .map((c) => ({ at: c.sent_at!, what: c.subject, kind: 'Newsletter' })),
              ].sort((a, b) => a.at.localeCompare(b.at))

              if (!items.length) {
                return (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Nothing scheduled. Content dates appear here once a LinkedIn post has a
                    due date or a campaign has gone out.
                  </div>
                )
              }
              return items.map((i, n) => (
                <div key={n} className="row between center" style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <span className="tag mut" style={{ marginRight: 8 }}>{i.kind}</span>
                    <span style={{ fontSize: 13 }}>{i.what}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{when(i.at)}</span>
                </div>
              ))
            })()}
          </div>
          <div className="card-b" style={{ paddingTop: 0, fontSize: 12, color: 'var(--muted)' }}>
            Meetings and payment dates live in <b>Calendar &amp; Meetings</b>; this is the
            content side of the same month.
          </div>
        </div>
      )}
    </>
  )
}
