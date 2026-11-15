import { useLang } from '../lib/lang-context'
import type { AiReview } from '../lib/types'

/** The AI's analysis: the main explanation under the headline score. */
export default function AiOpinion({ review }: { review: AiReview }) {
  const { lang, t } = useLang()

  return (
    <div className="flex flex-col gap-3 rounded-[10px] border border-line p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{t.aiTitle}</h2>
        <span className="rounded-full border border-line-strong px-2 py-0.5 text-xs font-semibold text-muted">AI</span>
      </div>

      <p className="text-base leading-normal text-ink">{review.summary[lang]}</p>

      {review.reasons.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-semibold">{t.aiReasons}</div>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-normal text-soft">
            {review.reasons.map((r) => (
              <li key={r.en}>{r[lang]}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted">{t.aiNote}</p>
    </div>
  )
}
