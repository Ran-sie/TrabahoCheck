import { useLang } from '../lib/lang-context'
import type { Education, Experience } from '../lib/types'

const FOCUS = 'focus:outline-2 focus:outline-offset-2 focus:outline-brand'
const INPUT = `h-12 w-full rounded-[10px] border border-line-strong bg-card px-4 text-base text-ink placeholder:text-muted ${FOCUS}`
const BUTTON =
  'h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page'

/** One labelled text box inside a row. */
function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  required,
}: {
  id: string
  label: string
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  maxLength: number
  required?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-1 basis-40 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value ?? ''}
        maxLength={maxLength}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT}
      />
    </div>
  )
}

interface ListProps<T> {
  rows: T[]
  onChange: (rows: T[]) => void
}

export function ExperienceList({ rows, onChange }: ListProps<Experience>) {
  const { t } = useLang()

  function patch(index: number, change: Partial<Experience>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...change } : r)))
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t.experienceTitle}</h2>
      {rows.length === 0 && <p className="text-sm text-muted">{t.none}</p>}

      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[10px] border border-line bg-page p-3">
          <div className="flex flex-wrap gap-3">
            <Field id={`exp-title-${i}`} label={t.jobTitle} value={row.title} maxLength={100} onChange={(v) => patch(i, { title: v })} />
            <Field id={`exp-company-${i}`} label={t.company} value={row.company} maxLength={100} onChange={(v) => patch(i, { company: v })} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Field id={`exp-start-${i}`} label={t.startLabel} value={row.start} maxLength={30} placeholder={t.startPlaceholder} onChange={(v) => patch(i, { start: v })} />
            <Field id={`exp-end-${i}`} label={t.endLabel} value={row.end} maxLength={30} placeholder={t.endPlaceholder} onChange={(v) => patch(i, { end: v })} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`exp-desc-${i}`} className="text-sm font-semibold">
              {t.whatYouDid}
            </label>
            <textarea
              id={`exp-desc-${i}`}
              rows={3}
              maxLength={800}
              value={row.description ?? ''}
              onChange={(e) => patch(i, { description: e.target.value })}
              className={`w-full resize-y rounded-[10px] border border-line-strong bg-card px-4 py-3 text-base text-ink ${FOCUS}`}
            />
          </div>
          <button type="button" onClick={() => onChange(rows.filter((_, n) => n !== i))} className={`${BUTTON} w-fit text-danger`}>
            {t.removeRow}
          </button>
        </div>
      ))}

      {rows.length < 10 && (
        <button
          type="button"
          onClick={() => onChange([...rows, { title: '', company: null, start: null, end: null, description: null }])}
          className={`${BUTTON} w-fit`}
        >
          + {t.experienceAdd}
        </button>
      )}
    </div>
  )
}

export function EducationList({ rows, onChange }: ListProps<Education>) {
  const { t } = useLang()

  function patch(index: number, change: Partial<Education>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...change } : r)))
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{t.educationTitle}</h2>
      {rows.length === 0 && <p className="text-sm text-muted">{t.none}</p>}

      {rows.map((row, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[10px] border border-line bg-page p-3">
          <div className="flex flex-wrap gap-3">
            <Field id={`edu-school-${i}`} label={t.school} value={row.school} maxLength={120} onChange={(v) => patch(i, { school: v })} />
            <Field id={`edu-degree-${i}`} label={t.degree} value={row.degree} maxLength={120} onChange={(v) => patch(i, { degree: v })} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Field id={`edu-start-${i}`} label={t.startLabel} value={row.start} maxLength={30} placeholder="2021" onChange={(v) => patch(i, { start: v })} />
            <Field id={`edu-end-${i}`} label={t.endLabel} value={row.end} maxLength={30} placeholder="2025" onChange={(v) => patch(i, { end: v })} />
          </div>
          <button type="button" onClick={() => onChange(rows.filter((_, n) => n !== i))} className={`${BUTTON} w-fit text-danger`}>
            {t.removeRow}
          </button>
        </div>
      ))}

      {rows.length < 6 && (
        <button
          type="button"
          onClick={() => onChange([...rows, { school: '', degree: null, start: null, end: null }])}
          className={`${BUTTON} w-fit`}
        >
          + {t.educationAdd}
        </button>
      )}
    </div>
  )
}
