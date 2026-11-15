import { useRef, useState, type ChangeEvent } from 'react'
import { authApi, authMessage, AuthError, type AutofillResult } from '../lib/auth-api'
import { useAuth } from '../lib/auth-context'
import { useLang } from '../lib/lang-context'

const MAX_BYTES = 2 * 1024 * 1024
const OK_EXTENSIONS = /\.(pdf|docx)$/i

const BUTTON =
  'h-11 cursor-pointer rounded-[10px] border border-line-strong bg-card px-5 text-sm font-semibold hover:bg-page disabled:cursor-not-allowed disabled:opacity-50'

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  onSessionEnded: () => void
  /** Receives the details found in the resume and returns how many were usable. */
  onAutofill: (fields: AutofillResult['fields']) => number
}

export default function ResumeCard({ onSessionEnded, onAutofill }: Props) {
  const { lang, t } = useLang()
  const { user, setUser, logOut } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const resume = user?.resume ?? null

  /** Runs one resume action and turns any failure into a sentence for the page. */
  async function run(action: () => Promise<void>, okText?: string) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
      if (okText) setMessage({ kind: 'ok', text: okText })
    } catch (err) {
      const problem = err instanceof AuthError ? err.problem : 'generic'
      if (problem === 'expired') {
        logOut()
        onSessionEnded()
        return
      }
      setMessage({ kind: 'error', text: authMessage(problem, t) })
    } finally {
      setBusy(false)
    }
  }

  async function fill() {
    await run(async () => {
      const { fields } = await authApi.autofill()
      if (onAutofill(fields) === 0) setMessage({ kind: 'error', text: t.resumeNothing })
    })
  }

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // lets the same file be chosen again later
    if (!file) return
    if (!OK_EXTENSIONS.test(file.name)) return setMessage({ kind: 'error', text: t.resumeErrType })
    if (file.size > MAX_BYTES) return setMessage({ kind: 'error', text: t.resumeErrSize })

    await run(async () => {
      const { user: next } = await authApi.uploadResume(file)
      setUser(next)
    }, t.resumeDone)
  }

  const date = resume
    ? new Date(resume.uploaded_at).toLocaleDateString(lang === 'tl' ? 'fil-PH' : 'en-PH', { dateStyle: 'medium' })
    : ''

  return (
    <section
      aria-labelledby="resume-title"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="resume-title" className="text-xl font-bold tracking-tight">
          {t.resumeTitle}
        </h2>
        <p className="text-sm text-soft">{t.resumeText}</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onPick}
        className="hidden"
        aria-label={t.resumeUpload}
      />

      {resume ? (
        <div className="flex flex-col gap-3 rounded-[10px] border border-line bg-page p-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="truncate text-base font-semibold">{resume.name}</div>
            <div className="text-sm text-muted">
              {formatSize(resume.size)} · {t.resumeUploadedOn(date)}
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={fill}
            className="h-12 w-full cursor-pointer rounded-[10px] bg-brand px-5 text-base font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t.resumeFilling : t.resumeFill}
          </button>
          <p className="-mt-1 text-xs text-muted">{t.resumeFillNote}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => authApi.downloadResume(resume.name))} className={BUTTON}>
              {t.resumeDownload}
            </button>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={BUTTON}>
              {busy ? t.resumeUploading : t.resumeReplace}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const { user: next } = await authApi.removeResume()
                  setUser(next)
                }, t.resumeRemoved)
              }
              className={`${BUTTON} text-danger`}
            >
              {t.resumeRemove}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted">{t.resumeNone}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="h-12 cursor-pointer rounded-[10px] bg-brand px-7 text-base font-semibold text-white hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? t.resumeUploading : t.resumeUpload}
          </button>
        </div>
      )}

      <p className="text-sm text-muted">{t.resumeHint}</p>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={
            message.kind === 'error'
              ? 'rounded-[10px] bg-danger-tint px-4 py-3 text-sm text-danger'
              : 'rounded-[10px] bg-ok-tint px-4 py-3 text-sm font-semibold text-ok'
          }
        >
          {message.kind === 'ok' ? '✓ ' : ''}
          {message.text}
        </p>
      )}
    </section>
  )
}
