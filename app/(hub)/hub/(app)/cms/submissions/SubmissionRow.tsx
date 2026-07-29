'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setSubmissionStatus } from './actions'

export default function SubmissionRow({
  id,
  status,
  email,
}: {
  id: string
  status: string
  email: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  const move = (to: string) =>
    start(async () => {
      await setSubmissionStatus({ id, status: to })
      router.refresh()
    })

  return (
    <div className="row" style={{ gap: 5, justifyContent: 'flex-end' }}>
      {email && (
        <a className="btn sm" href={`mailto:${email}`}>
          Reply
        </a>
      )}
      {status !== 'actioned' && (
        <button className="btn sm" disabled={pending} onClick={() => move('actioned')}>
          Done
        </button>
      )}
      {status !== 'spam' && (
        <button className="btn sm" disabled={pending} onClick={() => move('spam')} title="Mark as spam">
          Spam
        </button>
      )}
    </div>
  )
}
