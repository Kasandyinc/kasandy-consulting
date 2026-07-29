'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { FormConfig, FormField, FieldType } from '@/lib/forms/config'
import { saveForm } from '../actions'

const TYPES: FieldType[] = ['text', 'email', 'tel', 'textarea', 'select', 'date']

export default function FormEditor({ form }: { form: FormConfig }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(null)

  const [name, setName] = useState(form.name)
  const [description, setDescription] = useState(form.description ?? '')
  const [submitLabel, setSubmitLabel] = useState(form.submitLabel)
  const [successMessage, setSuccessMessage] = useState(form.successMessage)
  const [notifyEmail, setNotifyEmail] = useState(form.notifyEmail ?? '')
  const [active, setActive] = useState(form.active)
  const [fields, setFields] = useState<FormField[]>(form.fields)

  const patch = (i: number, p: Partial<FormField>) =>
    setFields((f) => f.map((x, j) => (j === i ? { ...x, ...p } : x)))

  const move = (i: number, by: number) =>
    setFields((f) => {
      const j = i + by
      if (j < 0 || j >= f.length) return f
      const next = [...f]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  return (
    <>
      <div className="grid g2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card">
          <div className="card-h between">
            <h3>Form</h3>
            <label className="row center" style={{ gap: 7, cursor: 'pointer' }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                {active ? 'Open to the public' : 'Closed'}
              </span>
            </label>
          </div>
          <div className="card-b">
            <Text label="Name" value={name} onChange={setName} />
            <Text label="Where it lives" value={description} onChange={setDescription} />
            <Text label="Button label" value={submitLabel} onChange={setSubmitLabel} />
            <Text
              label="Thank-you message"
              value={successMessage}
              onChange={setSuccessMessage}
              textarea
            />
            <Text
              label="Notify (email)"
              value={notifyEmail}
              onChange={setNotifyEmail}
              hint="Leave blank to use the route's configured recipient."
            />
          </div>
        </div>

        <div className="card">
          <div className="card-h between">
            <h3>Preview</h3>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              as the visitor sees it
            </span>
          </div>
          <div className="card-b">
            {!active && (
              <p className="tag bad" style={{ marginBottom: 12 }}>
                Closed — this form will not render on the site.
              </p>
            )}
            {fields.map((f) => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, marginBottom: 4 }}>
                  {f.label}
                  {f.required && <span style={{ color: 'var(--bad)' }}> *</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    disabled
                    rows={3}
                    placeholder={f.placeholder}
                    style={inputStyle}
                  />
                ) : f.type === 'select' ? (
                  <select disabled style={inputStyle}>
                    <option>{f.placeholder ?? 'Select…'}</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input disabled type={f.type} placeholder={f.placeholder} style={inputStyle} />
                )}
              </div>
            ))}
            <button className="btn ox" disabled style={{ width: '100%', justifyContent: 'center' }}>
              {submitLabel || 'Submit'}
            </button>
            <p style={{ color: 'var(--good)', marginTop: 12, fontSize: 12.5 }}>{successMessage}</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h between">
          <h3>Fields</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            {fields.length} · keys are fixed
          </span>
        </div>
        <div className="card-b">
          {fields.map((f, i) => (
            <div
              key={f.key}
              style={{
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: 13,
                marginBottom: 10,
                background: 'var(--paper)',
              }}
            >
              <div className="row between center wrap" style={{ gap: 10 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {f.key}
                </span>
                <div className="row" style={{ gap: 5 }}>
                  <button className="btn sm" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">↑</button>
                  <button
                    className="btn sm"
                    disabled={i === fields.length - 1}
                    onClick={() => move(i, 1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <div className="row wrap" style={{ gap: 10, marginTop: 9, alignItems: 'flex-end' }}>
                <div style={{ flex: '2 1 220px' }}>
                  <label className="eyebrow" style={{ display: 'block' }}>Label</label>
                  <input
                    className="btn"
                    style={{ width: '100%', fontWeight: 400 }}
                    value={f.label}
                    onChange={(e) => patch(i, { label: e.target.value })}
                  />
                </div>
                <div style={{ flex: '1 1 130px' }}>
                  <label className="eyebrow" style={{ display: 'block' }}>Type</label>
                  <select
                    className="btn"
                    style={{ width: '100%' }}
                    value={f.type}
                    onChange={(e) => patch(i, { type: e.target.value as FieldType })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: '2 1 200px' }}>
                  <label className="eyebrow" style={{ display: 'block' }}>Placeholder</label>
                  <input
                    className="btn"
                    style={{ width: '100%', fontWeight: 400 }}
                    value={f.placeholder ?? ''}
                    onChange={(e) => patch(i, { placeholder: e.target.value })}
                  />
                </div>
                <label className="row center" style={{ gap: 6, cursor: 'pointer', paddingBottom: 9 }}>
                  <input
                    type="checkbox"
                    checked={f.required}
                    onChange={(e) => patch(i, { required: e.target.checked })}
                  />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>Required</span>
                </label>
              </div>

              {f.type === 'select' && (
                <div style={{ marginTop: 10 }}>
                  <label className="eyebrow" style={{ display: 'block' }}>
                    Options — one per line
                  </label>
                  <textarea
                    rows={Math.max(3, (f.options ?? []).length)}
                    value={(f.options ?? []).join('\n')}
                    onChange={(e) => patch(i, { options: e.target.value.split('\n') })}
                    style={{ ...inputStyle, fontFamily: 'var(--sans)' }}
                  />
                </div>
              )}
            </div>
          ))}

          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <button
              className="btn ox"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveForm({
                    slug: form.slug,
                    name,
                    description,
                    submitLabel,
                    successMessage,
                    notifyEmail,
                    active,
                    fields,
                  })
                  setFlash({ ok: res.ok, message: res.ok ? 'Saved — live on the site.' : res.error ?? 'Failed.' })
                  router.refresh()
                })
              }
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className="btn"
              onClick={() => {
                setName(form.name)
                setDescription(form.description ?? '')
                setSubmitLabel(form.submitLabel)
                setSuccessMessage(form.successMessage)
                setNotifyEmail(form.notifyEmail ?? '')
                setActive(form.active)
                setFields(form.fields)
                setFlash(null)
              }}
            >
              Revert
            </button>
          </div>

          {flash && (
            <p style={{ marginTop: 12, color: flash.ok ? 'var(--good)' : 'var(--bad)' }}>{flash.message}</p>
          )}
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 8,
  padding: '8px 11px',
  fontSize: 13,
  fontFamily: 'var(--sans)',
  background: '#fff',
}

function Text({
  label,
  value,
  onChange,
  textarea,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  textarea?: boolean
  hint?: string
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label className="eyebrow" style={{ display: 'block' }}>{label}</label>
      {textarea ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
      )}
      {hint && (
        <div style={{ color: 'var(--muted)', fontSize: 11.5, marginTop: 4 }}>{hint}</div>
      )}
    </div>
  )
}
