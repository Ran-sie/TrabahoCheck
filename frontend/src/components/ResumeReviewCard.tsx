import { useState } from 'react'
import { fetchResumeReview, type ResumeReviewResult } from '../lib/auth-api'
import { useLang } from '../lib/lang-context'
import type { ResumeLevel } from '../lib/types'

const COLORS: Record<ResumeLevel, string> = {
  strong: 'var(--ok)',
  okay: 'var(--warn)',
  weak: 'var(--danger)',
}

const BUTTON =
  'h-11 w-fit cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page disabled:cursor-not-allowed disabled:opacity-50'

interface Props {
  /** Puts the AI's suggested headline or summary into the profile boxes (not saved until the user saves). */
  onUse: (field: 'headline' | 'summary', text: string) => void
}

/** AI feedback on the saved profile, treated as the user's resume. */
export default function ResumeReviewCard({ onUse }: Props) {
  const { lang, t } = useLang()
  const [state, setState] = useState<'idle' | 'loading' | ResumeReviewResult>('idle')
  const [used, setUsed] = useState<'headline' | 'summary' | null>(null)

  async function load() {
    setState('loading')
    setUsed(null)
    setState(await fetchResumeReview())
  }

  function use(field: 'headline' | 'summary', text: string) {
    onUse(field, text)
    setUsed(field)
  }

  let body
  if (state === 'idle') {
    body = (
      <button type="button" onClick={load} className={BUTTON}>
        {t.reviewButton}
      </button>
    )
  } else if (state === 'loading') {
    body = (
      <p role="status" className="animate-pulse text-sm text-muted">
        {t.reviewLoading}
      </p>
    )
  } else if (!state.ok) {
    const message =
      state.code === 'empty_profile' ? t.reviewEmpty : state.code === 'network' ? t.errNetwork : t.reviewUnavailable
    body = (
      <>
        <p role="alert" className="rounded-[10px] bg-warn-tint px-4 py-3 text-sm text-warn">
          {message}
        </p>
        {state.code !== 'empty_profile' && (
          <button type="button" onClick={load} className={BUTTON}>
            {t.reviewButton}
          </button>
        )}
      </>
    )
  } else {
    const { review } = state
    const color = COLORS[review.level]
    body = (
      <>
        <div className="flex flex-wrap items-baseline gap-3">
          <div className="text-4xl leading-none font-bold tracking-tight" style={{ color }}>
            {review.score}%
          </div>
          <div className="text-lg font-semibold" style={{ color }}>
            {t.reviewLevel[review.level]}
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-track">
          <div className="h-full rounded-full" style={{ width: `${review.score}%`, background: color }} />
        </div>

        <p className="text-base leading-normal text-ink">{review.summary[lang]}</p>

        {review.strengths.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">{t.reviewStrengths}</div>
            <ul className="flex flex-col gap-1 rounded-[10px] bg-ok-tint px-4 py-3 text-sm text-ok">
              {review.strengths.map((p) => (
                <li key={p.en}>✓ {p[lang]}</li>
              ))}
            </ul>
          </div>
        )}

        {review.improvements.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="text-sm font-semibold">{t.reviewImprovements}</div>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-normal text-soft">
              {review.improvements.map((p) => (
                <li key={p.en}>{p[lang]}</li>
              ))}
            </ul>
          </div>
        )}

        {([['headline', t.reviewHeadline, review.headline], ['summary', t.reviewAbout, review.about]] as const).map(
          ([field, label, text]) =>
            text && (
              <div key={field} className="flex flex-col gap-2 rounded-[10px] border border-line p-3">
                <div className="text-sm font-semibold">{label}</div>
                <p className="text-sm leading-normal text-soft">{text}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => use(field, text)} className={BUTTON}>
                    {t.reviewUse}
                  </button>
                  {used === field && <span className="text-sm font-semibold text-ok">✓ {t.reviewUsed}</span>}
                </div>
              </div>
            ),
        )}

        <p className="text-xs text-muted">{t.reviewNote}</p>
        <button type="button" onClick={load} className={BUTTON}>
          {t.reviewAgain}
        </button>
      </>
    )
  }

  return (
    <section aria-labelledby="review" className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="review" className="text-lg font-bold tracking-tight">
          {t.reviewTitle}
        </h2>
        <p className="text-sm text-soft">{t.reviewText}</p>
        <p className="text-xs text-muted">{t.reviewSaveFirst}</p>
      </div>
      {body}
    </section>
  )
}
