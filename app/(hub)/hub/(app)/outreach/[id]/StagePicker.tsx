'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { changeStage } from './actions'
import { STAGES, STAGE_LABEL, type Stage } from '@/lib/engine/types'

/** Moving a prospect along the pipeline. Every move is audit-logged. */
export default function StagePicker({ orgId, stage }: { orgId: string; stage: Stage }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')

  return (
    <>
      <select
        className="btn sm"
        value={stage}
        disabled={pending}
        onChange={(e) =>
          start(async () => {
            const res = await changeStage(orgId, e.target.value)
            if (!res.ok) setError(res.error ?? 'Could not move.')
            else { setError(''); router.refresh() }
          })
        }
        aria-label="Pipeline stage"
      >
        {STAGES.map((s) => (
          <option key={s} value={s}>{STAGE_LABEL[s]}</option>
        ))}
      </select>
      {error && <span style={{ color: 'var(--bad)', fontSize: 12 }}>{error}</span>}
    </>
  )
}
