import { useState } from 'react'
import { useLang } from '../lib/lang-context'
import type { CheckResult, RiskLevel, Severity } from '../lib/types'
import { useAiReview } from '../lib/use-ai-review'
import AiOpinion from './AiOpinion'
import type { View } from './Header'
import JobFitCard from './JobFitCard'
import NextSteps from './NextSteps'

const COLORS: Record<RiskLevel, { color: string; tint: string }> = {
  high: { color: 'var(--danger)', tint: 'var(--danger-tint)' },
  medium: { color: 'var(--warn)', tint: 'var(--warn-tint)' },
  low: { color: 'var(--ok)', tint: 'var(--ok-tint)' },
}

const SEVERITY_COLOR: Record<Severity, string> = {
  high: 'var(--danger)',
  medium: 'var(--warn)',
  low: 'var(--muted)',
}

interface Props {
  result: CheckResult
  onReset: () => void
  onNavigate: (view: View) => void
}

export default function ResultCard({ result, onReset, onNavigate }: Props) {
  const { lang, t } = useLang()
  const [copied, setCopied] = useState(false)
  const [warned, setWarned] = useState(false)

  // The AI leads when it answers. If it is off or fails, the rule result stands in.
  const ai = useAiReview(result.review_id)
  const score = ai.review ? ai.review.final.score : result.score
  const level = ai.review ? ai.review.final.level : result.level
  const s = COLORS[level]
  const label = t.risk[level]

  async function copyResult() {
    const lines = [
      t.copyHeader(score, label),
      ...result.flags.map((f) => {
        const title = lang === 'tl' ? f.tl.title : f.title
        return `- ${title}${f.evidence ? ` ("${f.evidence}")` : ''}`
      }),
      t.copyFooter,
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }

  async function copyWarning() {
    const lines = [
      t.warnHeader(score),
      ...result.flags.slice(0, 3).map((f) => `- ${lang === 'tl' ? f.tl.title : f.title}`),
      t.warnFooter,
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setWarned(true)
      setTimeout(() => setWarned(false), 2000)
    } catch {
      // Clipboard can be blocked; nothing else to do.
    }
  }

  return (
    <section
      aria-live="polite"
      className="mt-6 flex flex-col gap-5 rounded-2xl border border-line bg-card p-4 sm:p-6"
    >
      <div className="text-sm font-semibold text-muted">{t.result}</div>

      {ai.status === 'loading' ? (
        <div className="flex flex-col gap-3" role="status">
          <div className="animate-pulse text-[56px] leading-none font-bold tracking-tight text-muted">…</div>
          <p className="animate-pulse text-base text-muted">{t.aiLoading}</p>
          <div className="h-3 overflow-hidden rounded-full bg-track" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-4">
            <div className="text-[56px] leading-none font-bold tracking-tight" style={{ color: s.color }}>
              {score}%
            </div>
            <div className="text-xl font-semibold" style={{ color: s.color }}>
              {label}
            </div>
          </div>

          <div className="h-3 overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full" style={{ width: `${score}%`, background: s.color }} />
          </div>

          {ai.review && <p className="-mt-2 text-xs text-muted">{t.mainByAi}</p>}

          <div
            className="rounded-[10px] px-4 py-3 text-base leading-snug font-semibold"
            style={{ background: s.tint, color: s.color }}
          >
            {t.verdict[level]}
          </div>
        </>
      )}

      {ai.review && <AiOpinion review={ai.review} />}

      {result.review_id && ai.review && level !== 'high' && (
        <JobFitCard reviewId={result.review_id} onNavigate={onNavigate} />
      )}

      {result.flags.length === 0 && <p className="text-base text-soft">{t.noFlags}</p>}

      {result.flags.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">{t.whyTitle(result.flags.length)}</h2>
          {result.flags.map((flag) => {
            const color = SEVERITY_COLOR[flag.severity]
            const title = lang === 'tl' ? flag.tl.title : flag.title
            const detail = lang === 'tl' ? flag.tl.detail : flag.detail
            return (
              <div
                key={flag.title}
                className="flex items-start gap-3 rounded-[10px] px-4 py-3"
                style={{ background: s.tint }}
              >
                <div className="mt-2 h-2 w-2 flex-none rounded-full" style={{ background: color }} />
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-base font-semibold">{title}</div>
                    <span
                      className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                      style={{ color, borderColor: color }}
                    >
                      {t.severity[flag.severity]}
                    </span>
                  </div>
                  <div className="text-sm leading-normal text-soft">{detail}</div>
                  {flag.evidence && (
                    <div className="text-sm text-muted">
                      {t.weSaw} <span className="font-medium text-ink">“{flag.evidence}”</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <NextSteps level={level} />

      {result.positives.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t.goodSigns}</h2>
          <ul className="flex flex-col gap-1 rounded-[10px] bg-ok-tint px-4 py-3 text-sm text-ok">
            {result.positives.map((p) => (
              <li key={p.en}>✓ {p[lang]}</li>
            ))}
          </ul>
        </div>
      )}

      {result.company.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t.companyTitle}</h2>
          <p className="text-sm text-muted">{t.companyHint}</p>
          <ul className="flex flex-col gap-1 rounded-[10px] border border-line px-4 py-3 text-sm">
            {result.company.map((c) => (
              <li key={c.domain} className="flex flex-wrap justify-between gap-x-4">
                <span className="font-medium">{c.domain}</span>
                <span className="text-soft">{t.companyAge(c.age_days, c.exists)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-sm leading-normal text-muted">{t.disclaimer}</p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page"
        >
          {t.checkAnother}
        </button>
        <button
          type="button"
          onClick={copyResult}
          className="h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page"
        >
          {copied ? t.copied : t.copyResult}
        </button>
        {level !== 'low' && (
          <button
            type="button"
            onClick={copyWarning}
            className="h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page"
          >
            {warned ? t.copied : t.copyWarning}
          </button>
        )}
      </div>
    </section>
  )
}
