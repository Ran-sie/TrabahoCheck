import { useState } from 'react'
import { fetchJobFit, type JobFitResult } from '../lib/auth-api'
import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'
import type { FitLevel } from '../lib/types'
import type { View } from './Header'

const COLORS: Record<FitLevel, { color: string; tint: string }> = {
  strong: { color: 'var(--ok)', tint: 'var(--ok-tint)' },
  partial: { color: 'var(--warn)', tint: 'var(--warn-tint)' },
  weak: { color: 'var(--danger)', tint: 'var(--danger-tint)' },
}

interface Props {
  /** The id of the finished check; the server reads the job post from it. */
  reviewId: string
  onNavigate: (view: View) => void
}

/** "How well do you fit this job?" Shown under a check that does not look like a scam. */
export default function JobFitCard({ reviewId, onNavigate }: Props) {
  const { lang, t } = useLang()
  const { status } = useAuth()
  const [state, setState] = useState<'idle' | 'loading' | JobFitResult>('idle')

  async function load() {
    setState('loading')
    setState(await fetchJobFit(reviewId))
  }

  const button =
    'h-11 w-fit cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page'

  let body
  if (status !== 'in') {
    body = (
      <>
        <p className="text-sm leading-normal text-soft">{t.fitLoginHint}</p>
        <button type="button" onClick={() => onNavigate('login')} className={button}>
          {t.login}
        </button>
      </>
    )
  } else if (state === 'idle') {
    body = (
      <>
        <p className="text-sm leading-normal text-soft">{t.fitText}</p>
        <button type="button" onClick={load} className={button}>
          {t.fitButton}
        </button>
      </>
    )
  } else if (state === 'loading') {
    body = (
      <p role="status" className="animate-pulse text-sm text-muted">
        {t.fitLoading}
      </p>
    )
  } else if (!state.ok) {
    const message =
      state.code === 'empty_profile'
        ? t.fitEmptyProfile
        : state.code === 'expired'
          ? t.fitExpired
          : state.code === 'network'
            ? t.errNetwork
            : state.code === 'login'
              ? t.fitLoginHint
              : t.fitUnavailable
    body = (
      <>
        <p role="alert" className="rounded-[10px] bg-warn-tint px-4 py-3 text-sm text-warn">
          {message}
        </p>
        {state.code === 'empty_profile' && (
          <button type="button" onClick={() => onNavigate('profile')} className={button}>
            {t.fitProfileCta}
          </button>
        )}
        {(state.code === 'network' || state.code === 'unavailable') && (
          <button type="button" onClick={load} className={button}>
            {t.fitButton}
          </button>
        )}
      </>
    )
  } else {
    const { fit } = state
    const c = COLORS[fit.level]
    body = (
      <>
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="text-4xl leading-none font-bold tracking-tight" style={{ color: c.color }}>
            {fit.score}%
          </div>
          <div className="text-lg font-semibold" style={{ color: c.color }}>
            {t.fitLevel[fit.level]}
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full" style={{ width: `${fit.score}%`, background: c.color }} />
        </div>

        <p className="text-base leading-normal text-ink">{fit.summary[lang]}</p>

        {fit.matched.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold">{t.fitMatched}</div>
            <ul className="flex flex-wrap gap-2">
              {fit.matched.map((m) => (
                <li key={m} className="rounded-full bg-ok-tint px-3 py-1 text-sm font-medium text-ok">
                  ✓ {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fit.missing.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold">{t.fitMissing}</div>
            <ul className="flex flex-wrap gap-2">
              {fit.missing.map((m) => (
                <li key={m} className="rounded-full bg-warn-tint px-3 py-1 text-sm font-medium text-warn">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {fit.tips.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">{t.fitTips}</div>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-normal text-soft">
              {fit.tips.map((tip) => (
                <li key={tip.en}>{tip[lang]}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted">{t.fitNote}</p>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-line p-4">
      <h2 className="text-base font-semibold">{t.fitTitle}</h2>
      {body}
    </div>
  )
}
